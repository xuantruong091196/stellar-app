import { useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Link, useNavigate, useSearchParams } from "@remix-run/react";
import { api } from "~/lib/api";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Provider Login",
    description: "Sign in to your Stelo provider dashboard.",
    path: "/provider-login",
    noIndex: true,
  });

/**
 * Write the provider JWT to a cookie that every `/provider/*` loader can
 * read. Same helper as provider-onboarding — client-side only, Path=/,
 * SameSite=Lax, Secure when on https. Kept inline here to avoid adding a
 * shared util for a 7-line function.
 */
function setProviderTokenCookie(token: string, maxAgeSec = 86400) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `provider_token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

/** Only allow in-app redirects (leading `/`, not protocol-relative). */
function safeNext(next: string | null): string {
  if (!next || typeof next !== "string") return "/provider/orders";
  if (!next.startsWith("/") || next.startsWith("//")) return "/provider/orders";
  if (next.includes("\\")) return "/provider/orders";
  return next;
}

export default function ProviderLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await api<{
        token: string;
        provider: { id: string };
      }>("/provider-auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (result.error || !result.data) {
        setError(result.error || "Login failed");
        return;
      }

      setProviderTokenCookie(result.data.token);
      localStorage.setItem("provider_token", result.data.token);
      navigate(next);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 stellar-gradient opacity-10 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.1), transparent 50%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img
              src="/images/logo.png"
              alt="Stelo logo"
              className="w-12 h-12 rounded-2xl object-contain shadow-lg"
            />
            <span className="text-2xl font-bold stellar-text-gradient font-headline">
              Stelo
            </span>
          </div>
          <h1 className="text-3xl font-headline font-bold">Provider Login</h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Sign in to access your provider dashboard.
          </p>
        </div>

        <div className="bg-surface-container-low rounded-3xl p-8 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl text-sm">
                <p className="font-bold">Login failed</p>
                <p className="opacity-80 mt-1">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@acmeprint.co"
                className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" aria-hidden>
                    login
                  </span>
                  Sign in
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-outline-variant/10 text-center text-sm text-on-surface-variant">
            New here?{" "}
            <Link
              to="/provider-onboarding"
              className="text-primary font-bold hover:underline"
            >
              Create a provider account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

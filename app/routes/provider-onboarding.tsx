import { useState } from "react";
import type { MetaFunction } from "@remix-run/node";
import { api } from "~/lib/api";
import { pageMeta } from "~/lib/seo";
import type { PrintArea } from "~/lib/types";

/**
 * Write the provider JWT to a cookie that every Remix loader under
 * `/provider/*` can read. Client-side only — browsers accept Set-Cookie
 * from `document.cookie` when the caller is on the same origin.
 *
 * `Secure` is gated on `location.protocol === 'https:'` so dev on
 * `http://localhost:3000` still works. `SameSite=Lax` is fine: the cookie
 * only needs to survive same-origin GET navigations, which is how the
 * onboarding flow hands off to `/provider/orders`.
 */
function setProviderTokenCookie(token: string, maxAgeSec = 86400) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `provider_token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
}

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Provider Onboarding",
    description:
      "Register as a print-on-demand provider on the Stellar network. Add your first product and submit for verification.",
    path: "/provider-onboarding",
  });

// ─── Default print areas by product type ─────────────────────────
const DEFAULT_PRINT_AREAS: Record<string, PrintArea[]> = {
  "t-shirt": [{ name: "front", widthPx: 4200, heightPx: 4800, dpi: 300 }],
  mug: [{ name: "wrap", widthPx: 3600, heightPx: 1500, dpi: 300 }],
  hoodie: [{ name: "front", widthPx: 3600, heightPx: 3600, dpi: 300 }],
  poster: [{ name: "front", widthPx: 3600, heightPx: 3600, dpi: 300 }],
  "tote-bag": [{ name: "front", widthPx: 3600, heightPx: 3600, dpi: 300 }],
};

const PRODUCT_TYPES = ["t-shirt", "hoodie", "mug", "poster", "tote-bag"];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  "t-shirt": "T-Shirt",
  hoodie: "Hoodie",
  mug: "Mug",
  poster: "Poster",
  "tote-bag": "Tote Bag",
};

type OnboardingStep = 1 | 2 | 3;

interface RegistrationData {
  providerId: string;
  token: string;
  name: string;
  contactEmail: string;
  stellarAddress: string;
  country: string;
}

interface ProductData {
  productId: string;
  productType: string;
  name: string;
  baseCost: number;
}

export default function ProviderOnboarding() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [registration, setRegistration] = useState<RegistrationData | null>(
    null,
  );
  const [product, setProduct] = useState<ProductData | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 stellar-gradient opacity-10 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(99,102,241,0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(34,211,238,0.1), transparent 50%)",
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Brand */}
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
          <h1 className="text-3xl font-headline font-bold">
            Provider Onboarding
          </h1>
          <p className="text-on-surface-variant mt-2">
            Set up your print-on-demand provider account in three easy steps.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator currentStep={step} />

        {/* Card */}
        <div className="bg-surface-container-low rounded-3xl p-8 backdrop-blur-md">
          {step === 1 && (
            <RegisterStep
              onComplete={(data) => {
                setRegistration(data);
                setStep(2);
              }}
            />
          )}
          {step === 2 && registration && (
            <AddProductStep
              registration={registration}
              onComplete={(data) => {
                setProduct(data);
                setStep(3);
              }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && registration && product && (
            <VerificationStep
              registration={registration}
              product={product}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ──────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: OnboardingStep }) {
  const steps = [
    { num: 1, label: "Register" },
    { num: 2, label: "Add Product" },
    { num: 3, label: "Verify" },
  ];

  return (
    <div className="mb-6">
      <p className="text-center text-sm text-on-surface-variant mb-4 font-mono">
        Step {currentStep} of 3
      </p>
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={
                s.num < currentStep
                  ? "w-8 h-8 rounded-full bg-green-400/20 border border-green-400 flex items-center justify-center"
                  : s.num === currentStep
                    ? "w-8 h-8 rounded-full stellar-gradient flex items-center justify-center"
                    : "w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center"
              }
            >
              {s.num < currentStep ? (
                <span className="material-symbols-outlined text-green-400 text-[14px]">
                  check
                </span>
              ) : (
                <span
                  className={
                    s.num === currentStep
                      ? "text-white text-xs font-bold"
                      : "text-on-surface-variant text-xs font-bold"
                  }
                >
                  {s.num}
                </span>
              )}
            </div>
            <span
              className={
                s.num <= currentStep
                  ? "text-xs font-medium text-on-surface"
                  : "text-xs text-on-surface-variant"
              }
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={
                  s.num < currentStep
                    ? "w-8 h-0.5 bg-green-400/40"
                    : "w-8 h-0.5 bg-outline-variant/20"
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: Register ────────────────────────────────────────────

function RegisterStep({
  onComplete,
}: {
  onComplete: (data: RegistrationData) => void;
}) {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [stellarAddress, setStellarAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await api<{ token: string; provider: { id: string } }>(
        "/provider-auth/register",
        {
          method: "POST",
          body: { contactEmail, password, name, country, stellarAddress },
        },
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.data) {
        setError("Unexpected response from server.");
        return;
      }

      // Persist the JWT as a cookie so every provider-authed Remix loader
      // (which reads `provider_token` from the Cookie header) can pick it up.
      // Also mirror to localStorage for client-side code that prefers that.
      //
      // NOTE: this cookie is set from JS, so it can't be HttpOnly. The token
      // has a 24h TTL on the server side anyway, and provider auth is
      // separate from the wallet-auth surface — XSS on a provider page
      // wouldn't compromise any merchant data.
      setProviderTokenCookie(result.data.token);
      localStorage.setItem("provider_token", result.data.token);

      onComplete({
        providerId: result.data.provider.id,
        token: result.data.token,
        name,
        contactEmail,
        stellarAddress,
        country,
      });
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-headline font-bold">Create your account</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl text-sm">
          <p className="font-bold">Registration failed</p>
          <p className="opacity-80 mt-1">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Business Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Print Co."
          className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Contact Email
        </label>
        <input
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Country
        </label>
        <input
          type="text"
          required
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="United States"
          className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Stellar Wallet Address
        </label>
        <input
          type="text"
          required
          value={stellarAddress}
          onChange={(e) => setStellarAddress(e.target.value)}
          placeholder="G..."
          className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary font-mono text-sm"
        />
        <p className="text-xs text-on-surface-variant mt-1.5 opacity-70">
          Your Stellar wallet address for USDC payouts
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating account...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined" aria-hidden>
              person_add
            </span>
            Create Account
          </>
        )}
      </button>
    </form>
  );
}

// ─── Step 2: Add first product ───────────────────────────────────

function AddProductStep({
  registration,
  onComplete,
  onBack,
}: {
  registration: RegistrationData;
  onComplete: (data: ProductData) => void;
  onBack: () => void;
}) {
  const [productType, setProductType] = useState("t-shirt");
  const [productName, setProductName] = useState("");
  const [baseCost, setBaseCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parsedCost = parseFloat(baseCost);
    if (isNaN(parsedCost) || parsedCost <= 0) {
      setError("Please enter a valid base cost.");
      setLoading(false);
      return;
    }

    const printAreas = DEFAULT_PRINT_AREAS[productType] ?? DEFAULT_PRINT_AREAS["poster"];

    try {
      const result = await api<{ id: string }>(
        "/provider-products",
        {
          method: "POST",
          body: {
            providerId: registration.providerId,
            productType,
            name: productName,
            baseCost: parsedCost,
            printAreas,
          },
          token: registration.token,
        },
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.data) {
        setError("Unexpected response from server.");
        return;
      }

      onComplete({
        productId: result.data.id,
        productType,
        name: productName,
        baseCost: parsedCost,
      });
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-headline font-bold">Add your first product</h2>
      <p className="text-sm text-on-surface-variant">
        Add a blank product to your catalog. You can add more later.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl text-sm">
          <p className="font-bold">Failed to add product</p>
          <p className="opacity-80 mt-1">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Product Type
        </label>
        <select
          required
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
        >
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>
              {PRODUCT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Product Name
        </label>
        <input
          type="text"
          required
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="Premium Cotton Tee"
          className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
          Base Cost (USD)
        </label>
        <input
          type="number"
          required
          step="0.01"
          min="0.01"
          value={baseCost}
          onChange={(e) => setBaseCost(e.target.value)}
          placeholder="8.50"
          className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary font-mono"
        />
      </div>

      {/* Print area preview */}
      <div className="bg-surface-container p-4 rounded-2xl">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
          Default Print Areas
        </p>
        <div className="flex gap-2 flex-wrap">
          {(DEFAULT_PRINT_AREAS[productType] ?? []).map((pa) => (
            <div
              key={pa.name}
              className="bg-surface-container-high px-3 py-2 rounded-xl text-xs"
            >
              <span className="font-bold">{pa.name}</span>
              <span className="text-on-surface-variant ml-2 font-mono">
                {pa.widthPx}&times;{pa.heightPx}px @ {pa.dpi}dpi
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-surface-container-high text-on-surface px-6 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            arrow_back
          </span>
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-[2] stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding product...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" aria-hidden>
                add_circle
              </span>
              Add Product
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Step 3: Submit for verification ─────────────────────────────

function VerificationStep({
  registration,
  product,
  onBack,
}: {
  registration: RegistrationData;
  product: ProductData;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await api(
        `/providers/${registration.providerId}`,
        {
          method: "PATCH",
          body: { integrationStatus: "pending" },
          token: registration.token,
        },
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="w-20 h-20 rounded-full bg-green-400/20 border-2 border-green-400 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-green-400 text-4xl">
            check_circle
          </span>
        </div>
        <h2 className="text-xl font-headline font-bold">
          Submitted for Verification
        </h2>
        <p className="text-on-surface-variant text-sm max-w-sm mx-auto">
          Your account is pending verification. We'll notify you at{" "}
          <span className="font-mono text-on-surface">
            {registration.contactEmail}
          </span>{" "}
          when approved.
        </p>
        <a
          href="/provider/orders"
          className="inline-flex items-center gap-2 stellar-gradient text-white px-8 py-3 rounded-full font-bold hover:brightness-110 transition-all"
        >
          <span className="material-symbols-outlined" aria-hidden>
            inbox
          </span>
          Go to Order Queue
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-headline font-bold">Review and submit</h2>
      <p className="text-sm text-on-surface-variant">
        Review your details below and submit for verification.
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-400/20 text-red-300 px-4 py-3 rounded-2xl text-sm">
          <p className="font-bold">Submission failed</p>
          <p className="opacity-80 mt-1">{error}</p>
        </div>
      )}

      {/* Account summary */}
      <div className="bg-surface-container p-5 rounded-2xl space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl stellar-gradient flex items-center justify-center text-white font-bold text-lg">
            {registration.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold font-headline">{registration.name}</p>
            <p className="text-xs text-on-surface-variant">
              {registration.country}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <SummaryRow label="Email" value={registration.contactEmail} />
          <SummaryRow
            label="Stellar Address"
            value={
              registration.stellarAddress.slice(0, 8) +
              "..." +
              registration.stellarAddress.slice(-8)
            }
            mono
          />
        </div>
      </div>

      {/* Product summary */}
      <div className="bg-surface-container p-5 rounded-2xl space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
          First Product
        </p>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <SummaryRow label="Name" value={product.name} />
          <SummaryRow
            label="Type"
            value={PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
          />
          <SummaryRow
            label="Base Cost"
            value={`$${product.baseCost.toFixed(2)}`}
            mono
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-surface-container-high text-on-surface px-6 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            arrow_back
          </span>
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-[2] stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" aria-hidden>
                verified
              </span>
              Submit for Verification
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-on-surface-variant text-xs uppercase tracking-wider font-bold">
        {label}
      </span>
      <span className={mono ? "font-mono text-sm" : "text-sm"}>{value}</span>
    </div>
  );
}

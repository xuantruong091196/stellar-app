import { useState, useEffect, useCallback } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import { motion, AnimatePresence } from "framer-motion";
import { requireUser } from "~/lib/session.server";
import { apiGet, deriveStoreId } from "~/lib/api";
import { pageMeta } from "~/lib/seo";
import type { PaginatedResponse, MerchantProduct } from "~/lib/types";

// ─── Types ──────────────────────────────────────────────────────

interface StoreInfo {
  id: string;
  shopifyDomain: string | null;
  shopifyConnected: boolean;
  name: string | null;
}

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

// ─── SEO ────────────────────────────────────────────────────────

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Onboarding",
    description:
      "Set up your Stelo store — verify your wallet, connect Shopify, and create your first product.",
    path: "/onboarding",
    noIndex: true,
  });

// ─── Loader ─────────────────────────────────────────────────────

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await requireUser(request);
  const storeId = deriveStoreId(walletAddress);

  // Fetch wallet info from Stellar Horizon, store settings, and products in parallel
  const [horizonRes, settingsRes, productsRes] = await Promise.all([
    fetch(`https://horizon.stellar.org/accounts/${walletAddress}`).catch(
      () => null,
    ),
    apiGet<StoreInfo>(`/settings/store/${storeId}`, walletAddress),
    apiGet<PaginatedResponse<MerchantProduct>>(
      `/products/store/${storeId}?limit=1`,
      walletAddress,
    ),
  ]);

  // Parse Horizon response
  let hasXlm = false;
  let hasUsdc = false;
  let xlmBalance = "0";

  if (horizonRes && horizonRes.ok) {
    try {
      const acc = (await horizonRes.json()) as { balances: HorizonBalance[] };
      const native = acc.balances.find(
        (b: HorizonBalance) => b.asset_type === "native",
      );
      xlmBalance = native?.balance ?? "0";
      hasXlm = parseFloat(xlmBalance) >= 2;
      hasUsdc = acc.balances.some(
        (b: HorizonBalance) =>
          b.asset_code === "USDC" && b.asset_issuer === USDC_ISSUER,
      );
    } catch {
      // Account parse failed — treat as unfunded
    }
  }

  // Determine Shopify connection
  const shopifyDomain = settingsRes.data?.shopifyDomain ?? null;
  // A wallet-only stub domain ends with .stelo.life — not a real Shopify store
  const shopifyConnected =
    !!shopifyDomain && !shopifyDomain.endsWith(".stelo.life");

  // Products count
  const productsCount = productsRes.data?.meta?.total ?? 0;

  return json({
    walletAddress,
    hasXlm,
    hasUsdc,
    xlmBalance,
    shopifyConnected,
    shopifyDomain: shopifyConnected ? shopifyDomain : null,
    hasProducts: productsCount > 0,
    productsCount,
  });
}

// ─── Animation Variants ─────────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    transition: { duration: 0.25 },
  }),
};

// ─── Main Component ─────────────────────────────────────────────

export default function Onboarding() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof loader>();

  // Merge fetcher data with initial loader data (for "Check Again")
  const loaderData = fetcher.data ?? data;

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [shopDomain, setShopDomain] = useState("");
  const [confettiActive, setConfettiActive] = useState(false);

  // Determine the starting step based on what's already done
  useEffect(() => {
    if (loaderData.hasXlm && loaderData.hasUsdc) {
      if (loaderData.shopifyConnected) {
        if (loaderData.hasProducts) {
          setStep(4);
        } else {
          setStep(3);
        }
      } else {
        setStep(2);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger confetti on step 4
  useEffect(() => {
    if (step === 4) {
      setConfettiActive(true);
      const timer = setTimeout(() => setConfettiActive(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleCheckAgain = useCallback(() => {
    fetcher.load("/onboarding");
  }, [fetcher]);

  const handleComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("stelo_onboarding_complete", "true");
    }
    navigate("/dashboard");
  }, [navigate]);

  const totalSteps = 4;

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

      {/* Confetti overlay */}
      {confettiActive && <ConfettiOverlay />}

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
        </div>

        {/* Step indicator */}
        <StepProgress currentStep={step} totalSteps={totalSteps} />

        {/* Card */}
        <div className="bg-surface-container-low rounded-3xl p-8 backdrop-blur-md overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <WalletCheckStep
                  walletAddress={loaderData.walletAddress}
                  hasXlm={loaderData.hasXlm}
                  hasUsdc={loaderData.hasUsdc}
                  xlmBalance={loaderData.xlmBalance}
                  onCheckAgain={handleCheckAgain}
                  isChecking={fetcher.state === "loading"}
                  onNext={goNext}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <ShopifyConnectStep
                  shopifyConnected={loaderData.shopifyConnected}
                  shopifyDomain={loaderData.shopifyDomain}
                  walletAddress={loaderData.walletAddress}
                  shopDomain={shopDomain}
                  onShopDomainChange={setShopDomain}
                  onNext={goNext}
                  onBack={goBack}
                />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <CreateProductStep
                  hasProducts={loaderData.hasProducts}
                  onNext={goNext}
                  onBack={goBack}
                />
              </motion.div>
            )}
            {step === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <CompletionStep
                  loaderData={loaderData}
                  onComplete={handleComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Step Progress ──────────────────────────────────────────────

function StepProgress({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  const labels = ["Wallet", "Shopify", "Product", "Done"];
  return (
    <div className="mb-6">
      <p className="text-center text-sm text-on-surface-variant mb-4 font-mono">
        Step {Math.min(currentStep, totalSteps)} of {totalSteps}
      </p>
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div key={stepNum} className="flex items-center gap-2">
              <div
                className={
                  isCompleted
                    ? "w-8 h-8 rounded-full bg-green-400/20 border border-green-400 flex items-center justify-center"
                    : isActive
                      ? "w-8 h-8 rounded-full stellar-gradient flex items-center justify-center"
                      : "w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/20 flex items-center justify-center"
                }
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-green-400 text-[14px]">
                    check
                  </span>
                ) : (
                  <span
                    className={
                      isActive
                        ? "text-white text-xs font-bold"
                        : "text-on-surface-variant text-xs font-bold"
                    }
                  >
                    {stepNum}
                  </span>
                )}
              </div>
              <span
                className={
                  stepNum <= currentStep
                    ? "text-xs font-medium text-on-surface"
                    : "text-xs text-on-surface-variant"
                }
              >
                {labels[i]}
              </span>
              {i < totalSteps - 1 && (
                <div
                  className={
                    isCompleted
                      ? "w-6 h-0.5 bg-green-400/40"
                      : "w-6 h-0.5 bg-outline-variant/20"
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Wallet Check ───────────────────────────────────────

function WalletCheckStep({
  walletAddress,
  hasXlm,
  hasUsdc,
  xlmBalance,
  onCheckAgain,
  isChecking,
  onNext,
}: {
  walletAddress: string;
  hasXlm: boolean;
  hasUsdc: boolean;
  xlmBalance: string;
  onCheckAgain: () => void;
  isChecking: boolean;
  onNext: () => void;
}) {
  const truncated = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;
  const walletReady = hasXlm && hasUsdc;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-headline font-bold mb-2">
          Welcome to Stelo
        </h2>
        <p className="text-on-surface-variant">
          Let&apos;s set up your store in 3 minutes
        </p>
      </div>

      {/* Wallet address */}
      <div className="bg-surface-container rounded-2xl p-4 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary text-2xl">
          account_balance_wallet
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
            Connected Wallet
          </p>
          <p className="font-mono text-sm truncate">{truncated}</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(walletAddress);
          }}
          className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
          title="Copy full address"
        >
          <span className="material-symbols-outlined text-[18px]">
            content_copy
          </span>
        </button>
      </div>

      {/* Checklist */}
      <div className="space-y-4">
        {/* XLM Balance */}
        <ChecklistItem
          checked={hasXlm}
          label="XLM Balance"
          sublabel={
            hasXlm
              ? `${parseFloat(xlmBalance).toFixed(2)} XLM available`
              : "Minimum 2 XLM required for Stellar account reserves"
          }
        />
        {!hasXlm && (
          <div className="ml-11 bg-surface-container rounded-xl p-4 text-sm space-y-2">
            <p className="text-on-surface-variant">To fund your wallet:</p>
            <ol className="list-decimal list-inside space-y-1 text-on-surface-variant">
              <li>
                Buy XLM on any exchange (Coinbase, Binance, etc.)
              </li>
              <li>
                Send at least 3 XLM to your address:
              </li>
            </ol>
            <code className="block bg-surface-container-high px-3 py-2 rounded-lg text-xs font-mono break-all select-all">
              {walletAddress}
            </code>
          </div>
        )}

        {/* USDC Trustline */}
        <ChecklistItem
          checked={hasUsdc}
          label="USDC Trustline"
          sublabel={
            hasUsdc
              ? "USDC asset enabled on your wallet"
              : "Required to receive USDC payments from customers"
          }
        />
        {!hasUsdc && hasXlm && (
          <div className="ml-11 bg-surface-container rounded-xl p-4 text-sm space-y-2">
            <p className="text-on-surface-variant">
              Add USDC to your Freighter wallet:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-on-surface-variant">
              <li>Open Freighter browser extension</li>
              <li>
                Go to <span className="font-bold text-on-surface">Manage Assets</span>
              </li>
              <li>
                Search for{" "}
                <span className="font-bold text-on-surface">USDC</span> by
                Circle
              </li>
              <li>Click &quot;Add&quot; and approve the transaction</li>
            </ol>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCheckAgain}
          disabled={isChecking}
          className="flex-1 bg-surface-container-high text-on-surface px-6 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors disabled:opacity-60"
        >
          {isChecking ? (
            <>
              <span className="w-5 h-5 border-2 border-on-surface-variant/30 border-t-on-surface rounded-full animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                refresh
              </span>
              Check Again
            </>
          )}
        </button>
        <button
          onClick={onNext}
          disabled={!walletReady}
          className="flex-[2] stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Next
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Shopify Connect ────────────────────────────────────

function ShopifyConnectStep({
  shopifyConnected,
  shopifyDomain,
  walletAddress,
  shopDomain,
  onShopDomainChange,
  onNext,
  onBack,
}: {
  shopifyConnected: boolean;
  shopifyDomain: string | null;
  walletAddress: string;
  shopDomain: string;
  onShopDomainChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-headline font-bold mb-2">
          Connect Shopify Store
        </h2>
        <p className="text-on-surface-variant text-sm">
          Link your Shopify store so Stelo can sync products and process orders
          automatically.
        </p>
      </div>

      {shopifyConnected ? (
        <div className="bg-green-400/10 border border-green-400/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-green-400 text-2xl">
              check_circle
            </span>
          </div>
          <div>
            <p className="font-bold font-headline">Shopify Connected</p>
            <p className="text-sm text-on-surface-variant font-mono">
              {shopifyDomain}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Shop Domain
            </label>
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => onShopDomainChange(e.target.value)}
              placeholder="your-store.myshopify.com"
              className="w-full bg-surface-container text-on-surface rounded-xl px-4 py-3 border-0 focus:ring-2 focus:ring-primary font-mono text-sm"
            />
            <p className="text-xs text-on-surface-variant mt-1.5 opacity-70">
              Enter your Shopify store domain (e.g.
              your-store.myshopify.com)
            </p>
          </div>
          <a
            href={`/auth/shopify/install?shop=${encodeURIComponent(shopDomain)}&wallet=${encodeURIComponent(walletAddress)}`}
            className={`w-full stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 transition-all ${
              !shopDomain.trim()
                ? "opacity-40 pointer-events-none"
                : ""
            }`}
          >
            <span className="material-symbols-outlined" aria-hidden>
              link
            </span>
            Connect Shopify
          </a>
        </>
      )}

      {/* Nav */}
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
          onClick={onNext}
          disabled={!shopifyConnected}
          className="flex-[2] stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Next
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Create Product ─────────────────────────────────────

function CreateProductStep({
  hasProducts,
  onNext,
  onBack,
}: {
  hasProducts: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-headline font-bold mb-2">
          Create Your First Product
        </h2>
        <p className="text-on-surface-variant text-sm">
          Design a product, set your price, and publish it to your Shopify store
          in minutes.
        </p>
      </div>

      {hasProducts ? (
        <div className="bg-green-400/10 border border-green-400/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-green-400 text-2xl">
              check_circle
            </span>
          </div>
          <div>
            <p className="font-bold font-headline">Product Created</p>
            <p className="text-sm text-on-surface-variant">
              You already have products in your store. Nice work!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-surface-container rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-2xl mt-0.5">
                palette
              </span>
              <div>
                <p className="font-bold text-sm">Upload a design</p>
                <p className="text-xs text-on-surface-variant">
                  PNG or JPG at 300 DPI for best print quality
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-2xl mt-0.5">
                storefront
              </span>
              <div>
                <p className="font-bold text-sm">Pick a provider product</p>
                <p className="text-xs text-on-surface-variant">
                  Choose from t-shirts, hoodies, mugs, posters and more
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-2xl mt-0.5">
                attach_money
              </span>
              <div>
                <p className="font-bold text-sm">Set your retail price</p>
                <p className="text-xs text-on-surface-variant">
                  You keep the profit margin — paid in USDC on Stellar
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate("/products/new")}
            className="w-full stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined" aria-hidden>
              add_circle
            </span>
            Create Product
          </button>
        </div>
      )}

      {/* Nav */}
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
          onClick={onNext}
          className="flex-[2] stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 transition-all"
        >
          {hasProducts ? "Next" : "Skip for now"}
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Completion ─────────────────────────────────────────

function CompletionStep({
  loaderData,
  onComplete,
}: {
  loaderData: {
    hasXlm: boolean;
    hasUsdc: boolean;
    shopifyConnected: boolean;
    shopifyDomain: string | null;
    hasProducts: boolean;
  };
  onComplete: () => void;
}) {
  return (
    <div className="space-y-6 text-center py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-green-400/20 border-2 border-green-400 flex items-center justify-center mx-auto"
      >
        <span className="material-symbols-outlined text-green-400 text-4xl">
          celebration
        </span>
      </motion.div>

      <div>
        <h2 className="text-2xl font-headline font-bold mb-2">
          You&apos;re All Set!
        </h2>
        <p className="text-on-surface-variant">
          Your Stelo store is ready to go. Here&apos;s a summary of your setup:
        </p>
      </div>

      {/* Summary */}
      <div className="bg-surface-container rounded-2xl p-5 text-left space-y-3">
        <SummaryItem
          icon="account_balance_wallet"
          label="Stellar Wallet"
          done={loaderData.hasXlm && loaderData.hasUsdc}
          detail={
            loaderData.hasXlm && loaderData.hasUsdc
              ? "XLM funded, USDC trustline active"
              : "Needs configuration"
          }
        />
        <SummaryItem
          icon="shopping_bag"
          label="Shopify Store"
          done={loaderData.shopifyConnected}
          detail={
            loaderData.shopifyConnected
              ? loaderData.shopifyDomain ?? "Connected"
              : "Not connected"
          }
        />
        <SummaryItem
          icon="inventory_2"
          label="Products"
          done={loaderData.hasProducts}
          detail={loaderData.hasProducts ? "At least one product" : "Skipped"}
        />
      </div>

      <button
        onClick={onComplete}
        className="w-full stellar-gradient text-white px-6 py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:brightness-110 transition-all"
      >
        <span className="material-symbols-outlined" aria-hidden>
          rocket_launch
        </span>
        Go to Dashboard
      </button>
    </div>
  );
}

// ─── Shared UI ──────────────────────────────────────────────────

function ChecklistItem({
  checked,
  label,
  sublabel,
}: {
  checked: boolean;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          checked
            ? "bg-green-400/20 border border-green-400"
            : "bg-surface-container-high border border-outline-variant/30"
        }`}
      >
        <span
          className={`material-symbols-outlined text-[16px] ${
            checked ? "text-green-400" : "text-on-surface-variant"
          }`}
        >
          {checked ? "check" : "close"}
        </span>
      </div>
      <div>
        <p
          className={`font-bold text-sm ${checked ? "text-green-400" : "text-on-surface"}`}
        >
          {label}
        </p>
        <p className="text-xs text-on-surface-variant">{sublabel}</p>
      </div>
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  done,
  detail,
}: {
  icon: string;
  label: string;
  done: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`material-symbols-outlined text-xl ${done ? "text-green-400" : "text-on-surface-variant"}`}
      >
        {icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-on-surface-variant">{detail}</p>
      </div>
      <span
        className={`material-symbols-outlined text-[18px] ${done ? "text-green-400" : "text-amber-400"}`}
      >
        {done ? "check_circle" : "warning"}
      </span>
    </div>
  );
}

// ─── Confetti ───────────────────────────────────────────────────

function ConfettiOverlay() {
  const pieces = Array.from({ length: 50 }, (_, i) => {
    const colors = [
      "#6366f1",
      "#22d3ee",
      "#4ade80",
      "#f59e0b",
      "#ef4444",
      "#a855f7",
    ];
    const color = colors[i % colors.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 2 + Math.random() * 2;
    const size = 4 + Math.random() * 6;
    const rotation = Math.random() * 360;

    return (
      <div
        key={i}
        className="absolute rounded-sm animate-confetti-fall"
        style={{
          left: `${left}%`,
          top: "-10px",
          width: `${size}px`,
          height: `${size * 0.6}px`,
          backgroundColor: color,
          transform: `rotate(${rotation}deg)`,
          animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
          opacity: 0.9,
        }}
      />
    );
  });

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {pieces}
      </div>
    </>
  );
}

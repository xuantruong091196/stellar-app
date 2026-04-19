import { useState, useEffect, useCallback } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getUserAddress } from "~/lib/session.server";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Launch Your POD Empire",
    description:
      "The first Shopify-integrated print-on-demand platform powered by the Stellar blockchain. Secure payments, automated fulfillment, and lightning-fast settlement in USDC.",
    path: "/",
  });

export async function loader({ request }: LoaderFunctionArgs) {
  const walletAddress = await getUserAddress(request);
  return json({ walletAddress });
}

const NAV_SECTIONS = ["features", "how-it-works", "pricing"] as const;

export default function IndexPage() {
  const { walletAddress } = useLoaderData<typeof loader>();
  const [activeSection, setActiveSection] = useState("");

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    for (const id of NAV_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const navLinkClass = (id: string) =>
    `font-headline tracking-tight transition-all duration-300 cursor-pointer ${
      activeSection === id
        ? "text-indigo-400 font-bold border-b-2 border-indigo-500 pb-1"
        : "text-slate-400 font-medium hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-[#121317] text-[#e3e2e8] font-body antialiased overflow-x-hidden scroll-smooth">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#121317]/80 backdrop-blur-md shadow-2xl shadow-black/50">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center h-20">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Stelo" className="h-8 w-auto" />
            <span className="text-2xl font-black text-white tracking-tighter font-headline">Stelo</span>
          </button>
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollTo("features")} className={navLinkClass("features")}>Features</button>
            <button onClick={() => scrollTo("how-it-works")} className={navLinkClass("how-it-works")}>How it Works</button>
            <button onClick={() => scrollTo("pricing")} className={navLinkClass("pricing")}>Pricing</button>
          </div>
          <div className="flex items-center gap-3">
            {walletAddress ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-slate-400 font-medium hover:text-white transition-all text-sm"
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard"
                  className="stellar-gradient px-5 py-2.5 rounded-full text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                  <span className="font-mono text-xs">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="stellar-gradient px-6 py-2.5 rounded-full text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-transform"
              >
                Connect Wallet
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden px-8">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-900/20 to-transparent blur-3xl -z-10" />
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="z-10 text-center lg:text-left">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-high mb-6 border border-outline-variant/20">
                <span className="material-symbols-outlined text-secondary text-sm mr-2" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="text-xs font-bold tracking-widest uppercase text-on-surface-variant">Powered by Soroban Smart Contracts</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                Launch Your{" "}
                <span className="stellar-text-gradient">Print-on-Demand</span>{" "}
                Empire on Stellar
              </h1>
              <p className="text-lg lg:text-xl text-on-surface-variant mb-10 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                The first Shopify-integrated POD platform powered by the Stellar blockchain. Secure payments, automated fulfillment, and lightning-fast settlement in USDC.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {walletAddress ? (
                  <Link
                    to="/dashboard"
                    className="stellar-gradient px-8 py-4 rounded-full text-white font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="stellar-gradient px-8 py-4 rounded-full text-white font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 text-center"
                  >
                    Connect Wallet
                  </Link>
                )}
                <a
                  href="#how-it-works"
                  className="bg-surface-container-high px-8 py-4 rounded-full text-primary font-bold text-lg hover:bg-surface-bright transition-all active:scale-95 text-center"
                >
                  See How It Works
                </a>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-indigo-500/10 blur-[120px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />
              <div className="relative rounded-3xl overflow-hidden aspect-square flex items-center justify-center">
                <img
                  alt="Stelo POD Visualization"
                  className="w-full h-full object-cover rounded-3xl mix-blend-lighten opacity-90"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAhDStje8Dac_SnT6_x_r2WJzwGElz4FrLyOtHMzOJL_XdWtj13SSgqLJ-ypYHox7srHyjP00NlCPXPVEonXyssDpyXbZi8gjy0shSf2tnCQmKviCKNLQ5vgXrVsf05l3-MMb6xNieYZtj6xz3CcUQNApws9ZqWKz63vBPQEoiIL-y3985TuE_zXzJkgpOuGz2V_BFwtOxPakNg_hxbTjsmYpcIPi3ePHlvT2cJZ8P6imWVaA7fbHI5XyMti76lBEnZL5tBR_Dx_lQ"
                />
                <div className="absolute bottom-8 right-8 glass-panel p-6 rounded-2xl border border-white/5 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary">payments</span>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Settlement</p>
                      <p className="text-lg font-mono font-bold text-white">4,280.50 USDC</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full stellar-gradient w-[85%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-8 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 tracking-tight">Enterprise Grade Infrastructure</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">Scaling your brand globally requires technical precision and absolute trust. We provide both.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard icon="shopping_cart" iconBg="bg-indigo-500/10" iconColor="text-primary" title="Shopify Native" description="Seamlessly sync your products and orders directly within your Shopify Admin. No context switching required." />
              <FeatureCard icon="verified_user" iconBg="bg-cyan-500/10" iconColor="text-secondary" title="Blockchain Escrow" description="Funds are secured in Soroban smart contracts, ensuring trust between merchants and providers until delivery." />
              <FeatureCard icon="public" iconBg="bg-primary-container/10" iconColor="text-primary" title="Global Fulfillment" description="Access a network of high-quality print providers worldwide with automated routing based on customer proximity." />
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24 px-8 relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-end justify-between mb-16 gap-6">
              <div className="max-w-xl">
                <h2 className="text-3xl lg:text-4xl font-bold mb-4 tracking-tight">From Design to Wallet</h2>
                <p className="text-on-surface-variant">The fastest way to take a creative idea and turn it into global revenue using the Stellar network.</p>
              </div>
              <div className="hidden lg:block h-px flex-1 bg-outline-variant/30 mx-12 mb-4" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              <Step num="01" icon="link" title="Connect Store" description="Install the Stelo app on Shopify and link your Stellar wallet address in seconds." />
              <Step num="02" icon="cloud_upload" title="Upload Designs" description="Create products using our intuitive design editor with AI-powered enhancement. We handle the rest." />
              <Step num="03" icon="currency_exchange" title="Automated Payouts" description="Orders trigger production instantly. Payouts are released in USDC to your wallet as soon as shipping is confirmed." />
            </div>
          </div>
        </section>

        {/* Partners */}
        <section className="py-16 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-white flex items-center justify-center p-1.5">
                  <img alt="Shopify Logo" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWAPyqzyC69mXeLgkKnAG01gbvbUCHznscVlh6IkA7K5NQeRpwbhlTIYTlbqXa4zDN2A7-ojWs7HEebgd2jriOjrDWHTtmI4wTAGVHKOBGqM7uAYBGHQugFNWTv0dz7FKfo24WBWYYaiE5jO8FxWM1Xh6HD9PElF8cA23Q2zxkKseQnqB7X2EElWoMzGnpBU6zkp7vk5c0H3q_1_xIhxrsLKUdUD1UYHLNzqlhJrQ47MdGbRtW3_WkXQ2F1MdG7aKFWSXWPKRW9nEB" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Shopify Partner</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1">
                  <img alt="Stellar Logo" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-O7w6L8TdRHMJM3W6ZXuoZJr58xR9R9yHOu08tDcEmJ_ZHRhNKr0X2DIh2_7ZPwe4GL1UknWw1Dau-ii3Mg5P4Lpq3d7VxIxabpWE6hw19Ro-HjimtV40S2q_HuX9h5axBYLOa5vNwNkIOPpCBgFweNgxMYjKHdu2XtEp89W14GM1P5X8h25UcxX9B2H26JD16CVux86H-MtZ2IcXV2mlL1WXwPveR11oTFra38_6fDd_e_QWKOJiXooODYJdyW-zVtgQyMbLVEOE" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Built on Stellar</span>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="pricing" className="py-24 px-8">
          <div className="max-w-5xl mx-auto relative">
            <div className="stellar-gradient p-[1px] rounded-[2rem]">
              <div className="bg-surface rounded-[2rem] p-12 lg:p-20 text-center overflow-hidden relative">
                <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full" />
                <div className="relative z-10">
                  <h2 className="text-4xl lg:text-5xl font-bold mb-6 tracking-tight">Ready to launch your empire?</h2>
                  <p className="text-xl text-on-surface-variant mb-10 max-w-2xl mx-auto">Join the future of retail. No monthly fees, no payment delays. Just global commerce at the speed of light.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to={walletAddress ? "/dashboard" : "/login"} className="stellar-gradient px-12 py-5 rounded-full text-white font-bold text-xl shadow-2xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all">
                      {walletAddress ? "Go to Dashboard" : "Connect Wallet"}
                    </Link>
                    <a href="mailto:hello@stelo.life" className="bg-surface-container-high px-12 py-5 rounded-full text-primary font-bold text-xl hover:bg-surface-bright active:scale-95 transition-all">
                      Contact Sales
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Digital Twin Section */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto text-center space-y-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              Digital Twin NFT
            </span>
            <h2 className="text-4xl md:text-5xl font-bold font-headline tracking-tighter">
              Every Product Comes With Its Digital Twin
            </h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">
              Buy a product. Own its NFT. Verify authenticity on the Stellar blockchain. Trade freely.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
              {[
                { icon: "shopping_bag", title: "Buy", desc: "Shop on Shopify as usual" },
                { icon: "token", title: "Own", desc: "NFT auto-minted to your wallet" },
                { icon: "qr_code_scanner", title: "Verify", desc: "Scan QR on product = blockchain proof" },
              ].map((step) => (
                <div key={step.title} className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10 space-y-3">
                  <span className="material-symbols-outlined text-3xl text-primary">{step.icon}</span>
                  <h3 className="text-lg font-bold font-headline">{step.title}</h3>
                  <p className="text-sm text-on-surface-variant">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Burn to Claim Section */}
        <section className="py-24 px-6 bg-surface-container-low/50">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <span className="material-symbols-outlined text-5xl text-amber-400">local_fire_department</span>
            <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tighter">Exclusive Drops</h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              Buy the NFT first. Burn it when you're ready to receive the physical product. Limited editions, true scarcity.
            </p>
          </div>
        </section>

        {/* Community Section */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tighter">Own a Piece of the Platform</h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              NFT holders are more than customers — they're community members.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              {[
                { icon: "lock", title: "Token-Gated Collections", badge: "Coming Soon" },
                { icon: "how_to_vote", title: "Vote on Designs", badge: "Coming Soon" },
                { icon: "payments", title: "Designer Royalties", badge: "Coming Soon" },
              ].map((item) => (
                <div key={item.title} className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 text-center space-y-2">
                  <span className="material-symbols-outlined text-2xl text-secondary">{item.icon}</span>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <span className="inline-block text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0d0e12] w-full py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-8 md:mb-0">
            <div className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent mb-4">Stelo</div>
            <p className="text-slate-500 font-headline text-sm uppercase tracking-widest">&copy; 2026 Stelo. Powered by Stellar &amp; Shopify.</p>
          </div>
          <div className="flex gap-8">
            <Link to="/privacy" className="text-slate-500 font-headline text-sm uppercase tracking-widest hover:text-cyan-400 transition-colors duration-200">Privacy Policy</Link>
            <Link to="/terms" className="text-slate-500 font-headline text-sm uppercase tracking-widest hover:text-cyan-400 transition-colors duration-200">Terms of Service</Link>
            <Link to="/refund-policy" className="text-slate-500 font-headline text-sm uppercase tracking-widest hover:text-cyan-400 transition-colors duration-200">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, iconBg, iconColor, title, description }: { icon: string; iconBg: string; iconColor: string; title: string; description: string }) {
  return (
    <div className="bg-surface-container-highest p-8 rounded-2xl hover:bg-surface-bright transition-all duration-300 group">
      <div className={`w-14 h-14 rounded-xl ${iconBg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
        <span className={`material-symbols-outlined ${iconColor} text-3xl`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-on-surface-variant leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ num, icon, title, description }: { num: string; icon: string; title: string; description: string }) {
  return (
    <div className="relative">
      <div className="text-[120px] font-black text-white/5 absolute -top-16 -left-4 pointer-events-none">{num}</div>
      <div className="relative z-10 pt-8">
        <div className="w-12 h-12 rounded-full stellar-gradient flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
          <span className="material-symbols-outlined text-white text-xl">{icon}</span>
        </div>
        <h4 className="text-2xl font-bold mb-4">{title}</h4>
        <p className="text-on-surface-variant leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({ title: "Privacy Policy", path: "/privacy" });

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated="April 11, 2026">
      <Section title="1. Information We Collect">
        <p>We collect information you provide directly, including your Stellar wallet address when you connect your wallet, and any product or design data you upload to the platform.</p>
        <p>We automatically collect certain technical information such as IP address, browser type, and usage patterns to improve our services.</p>
      </Section>
      <Section title="2. How We Use Your Information">
        <p>We use your information to operate and improve the Stelo platform, process transactions via the Stellar blockchain, fulfill print-on-demand orders, and communicate with you about your account.</p>
      </Section>
      <Section title="3. Blockchain Transactions">
        <p>Transactions on the Stellar blockchain are public and immutable. Your wallet address and transaction history are visible on the public ledger. We do not control or have the ability to modify blockchain data.</p>
      </Section>
      <Section title="4. Data Sharing">
        <p>We share order information with print providers (Printful, Printify, Gooten) as necessary to fulfill your orders. We do not sell your personal information to third parties.</p>
      </Section>
      <Section title="5. Data Security">
        <p>We implement industry-standard security measures including encrypted connections (TLS), secure session management, and containerized infrastructure. However, no method of transmission over the Internet is 100% secure.</p>
      </Section>
      <Section title="6. Cookies">
        <p>We use a session cookie (<code className="font-mono text-primary bg-surface-container px-1 rounded">__stelo_session</code>) to maintain your authenticated session. This cookie is httpOnly, secure, and expires after 24 hours.</p>
      </Section>
      <Section title="7. Your Rights">
        <p>You may disconnect your wallet at any time to terminate your session. You can request deletion of your account data by contacting us at <a href="mailto:privacy@stelo.life" className="text-primary hover:underline">privacy@stelo.life</a>.</p>
      </Section>
      <Section title="8. Changes">
        <p>We may update this policy from time to time. We will notify you of significant changes by posting a notice on the platform.</p>
      </Section>
    </LegalLayout>
  );
}

function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121317] text-[#e3e2e8] font-body">
      <nav className="fixed top-0 w-full z-50 bg-[#121317]/80 backdrop-blur-md shadow-2xl shadow-black/50">
        <div className="max-w-4xl mx-auto px-8 flex items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/images/logo.png" alt="Stelo" className="h-7 w-auto" />
            <span className="text-xl font-black text-white tracking-tighter font-headline">Stelo</span>
          </Link>
        </div>
      </nav>
      <main className="pt-24 pb-20 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold font-headline mb-2 tracking-tight">{title}</h1>
          <p className="text-on-surface-variant text-sm mb-12">Last updated: {updated}</p>
          <div className="space-y-8">{children}</div>
        </div>
      </main>
      <footer className="bg-[#0d0e12] py-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <Link to="/" className="text-primary hover:underline text-sm">&larr; Back to Stelo</Link>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold font-headline mb-3">{title}</h2>
      <div className="space-y-3 text-on-surface-variant leading-relaxed">{children}</div>
    </section>
  );
}

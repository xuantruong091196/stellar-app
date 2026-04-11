import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { pageMeta } from "~/lib/seo";

export const meta: MetaFunction = () =>
  pageMeta({ title: "Refund Policy", path: "/refund-policy" });

export default function RefundPolicy() {
  return (
    <LegalLayout title="Refund Policy" updated="April 11, 2026">
      <Section title="1. Overview">
        <p>Stelo facilitates print-on-demand orders between merchants and print providers. Because each product is custom-made to order, our refund policy reflects the nature of custom manufacturing.</p>
      </Section>
      <Section title="2. Eligible Refunds">
        <p>Refunds may be issued in the following cases:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>The product arrives damaged or defective</li>
          <li>The product is significantly different from the design preview</li>
          <li>The order was not delivered within 30 days of the estimated delivery date</li>
          <li>The wrong product or size was delivered</li>
        </ul>
      </Section>
      <Section title="3. Non-Eligible Refunds">
        <p>Refunds are not available for:</p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Change of mind after the order has entered production</li>
          <li>Minor color variations due to differences between screen displays and print output</li>
          <li>Incorrect shipping address provided by the customer</li>
        </ul>
      </Section>
      <Section title="4. How to Request a Refund">
        <p>To request a refund, the customer should contact the merchant directly. The merchant can then initiate a dispute through the Stelo escrow system. Disputes are resolved based on evidence provided by both parties.</p>
      </Section>
      <Section title="5. Escrow Protection">
        <p>All payments are held in Soroban smart contract escrow until shipping is confirmed. If a dispute is raised before escrow release, funds remain locked until resolution. This protects both merchants and customers.</p>
      </Section>
      <Section title="6. Processing Time">
        <p>Approved refunds are processed within 5-10 business days. Refunds are issued in USDC to the original payment source via the Stellar network.</p>
      </Section>
      <Section title="7. Contact">
        <p>For refund-related questions, contact us at <a href="mailto:support@stelo.life" className="text-primary hover:underline">support@stelo.life</a>.</p>
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

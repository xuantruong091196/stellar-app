import type { MetaFunction } from "@remix-run/node";
import { pageMeta } from "~/lib/seo";
import { LegalLayout, Section } from "~/components/legal/LegalLayout";

export const meta: MetaFunction = () =>
  pageMeta({ title: "Terms of Service", path: "/terms" });

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" updated="April 11, 2026">
      <Section title="1. Acceptance of Terms">
        <p>By accessing or using Stelo ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform.</p>
      </Section>
      <Section title="2. Description of Service">
        <p>Stelo is a decentralized print-on-demand (POD) platform that connects merchants with print providers via Shopify integration. Payments are settled on the Stellar blockchain using USDC stablecoin through Soroban smart contract escrow.</p>
      </Section>
      <Section title="3. Account & Wallet">
        <p>You authenticate by connecting a Stellar wallet via the Freighter browser extension. You are solely responsible for the security of your wallet and private keys. Stelo does not store or have access to your private keys.</p>
      </Section>
      <Section title="4. Merchant Responsibilities">
        <p>As a merchant, you are responsible for ensuring your product designs do not infringe on intellectual property rights, comply with applicable laws, and meet the content guidelines of our print providers.</p>
      </Section>
      <Section title="5. Escrow & Payments">
        <p>When a customer places an order, funds are locked in a Soroban smart contract escrow. Funds are released to the merchant upon shipping confirmation. Disputes are handled through the escrow dispute resolution mechanism.</p>
      </Section>
      <Section title="6. Platform Fee">
        <p>Stelo charges a 5% platform fee on each transaction, deducted automatically from the retail price before profit calculation. There are no monthly subscription fees.</p>
      </Section>
      <Section title="7. Intellectual Property">
        <p>You retain ownership of designs you upload. By uploading, you grant Stelo a non-exclusive license to use your designs solely for the purpose of fulfilling print-on-demand orders.</p>
      </Section>
      <Section title="8. Limitation of Liability">
        <p>Stelo is provided "as is" without warranties. We are not liable for losses arising from blockchain transactions, print provider errors, shipping delays, or wallet security breaches.</p>
      </Section>
      <Section title="9. Termination">
        <p>We may suspend or terminate your access if you violate these terms. You may stop using the Platform at any time by disconnecting your wallet.</p>
      </Section>
      <Section title="10. Governing Law">
        <p>These terms are governed by the laws of the jurisdiction in which Stelo operates. Disputes will be resolved through binding arbitration.</p>
      </Section>
      <Section title="11. Contact">
        <p>For questions about these terms, contact us at <a href="mailto:legal@stelo.life" className="text-primary hover:underline">legal@stelo.life</a>.</p>
      </Section>
    </LegalLayout>
  );
}

import type { MetaFunction } from "@remix-run/node";
import { pageMeta } from "~/lib/seo";
import { LegalLayout, Section } from "~/components/legal/LegalLayout";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Privacy Policy",
    description:
      "How Stelo collects, uses, and protects your data on our print-on-demand platform.",
    path: "/privacy",
  });

const CONTACT_EMAIL = "xuantruongdeveloper0911@gmail.com";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated="April 11, 2026">
      <Section title="1. Introduction">
        <p>
          Stelo ("we", "us", "our") operates the Stelo print-on-demand platform
          at stelo.life. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you use our platform.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <p>We collect the following types of information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Shopify Store Data</strong> — store name, connected
            products, and order information synced through the Shopify API.
          </li>
          <li>
            <strong>Stellar Wallet Addresses</strong> — your public wallet
            address used for authentication and payments. We never collect or
            store your private keys.
          </li>
          <li>
            <strong>Design Files</strong> — images, graphics, and designs you
            upload to the design editor for print-on-demand products.
          </li>
          <li>
            <strong>Usage Analytics</strong> — page views, feature usage
            patterns, and technical information (browser type, device) to
            improve the platform.
          </li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Fulfill print-on-demand orders by sharing necessary details with
            print providers.
          </li>
          <li>
            Sync products and orders between Stelo and your Shopify store.
          </li>
          <li>
            Process payments via the Stellar blockchain using USDC stablecoin.
          </li>
          <li>Improve platform features, performance, and user experience.</li>
          <li>
            Communicate with you about your account, orders, and platform
            updates.
          </li>
        </ul>
      </Section>

      <Section title="4. Blockchain Data">
        <p>
          Stelo uses the Stellar blockchain for payment processing and escrow.
          Please be aware that:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            All Stellar transactions are recorded on a public, immutable ledger.
          </li>
          <li>
            Your wallet address and transaction amounts are publicly visible to
            anyone.
          </li>
          <li>
            Escrow contract states (locked funds, releases, disputes) are
            publicly auditable on-chain.
          </li>
          <li>
            We cannot modify, delete, or reverse blockchain transactions once
            confirmed.
          </li>
        </ul>
      </Section>

      <Section title="5. Data Sharing">
        <p>We share your information with third parties only as follows:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Print Providers</strong> — receive order details (shipping
            address, design files) necessary to fulfill and ship your orders.
          </li>
          <li>
            <strong>Shopify</strong> — receives product and order sync data
            through the Shopify API integration.
          </li>
          <li>
            We do <strong>not</strong> sell, rent, or trade your personal
            information to third parties for marketing purposes.
          </li>
        </ul>
      </Section>

      <Section title="6. Data Storage & Security">
        <p>
          Your data is stored on encrypted servers with industry-standard
          security practices. Design files are stored securely and permanently
          deleted upon account closure. We use HTTPS/TLS encryption for all data
          in transit, httpOnly secure session cookies, and containerized
          infrastructure with strict access controls.
        </p>
        <p>
          While we implement robust security measures, no method of electronic
          transmission or storage is 100% secure. We cannot guarantee absolute
          security of your data.
        </p>
      </Section>

      <Section title="7. Cookies">
        <p>
          We use a session cookie (
          <code className="font-mono text-primary bg-surface-container px-1 rounded">
            __stelo_session
          </code>
          ) to maintain your authenticated session. This cookie is httpOnly,
          secure, and expires after 24 hours. We do not use third-party tracking
          cookies or advertising cookies.
        </p>
      </Section>

      <Section title="8. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Request Data Export</strong> — obtain a copy of all personal
            data we hold about you.
          </li>
          <li>
            <strong>Request Data Deletion</strong> — ask us to delete your
            account and associated data.
          </li>
          <li>
            <strong>Opt Out of Analytics</strong> — contact us to opt out of
            non-essential usage analytics.
          </li>
          <li>
            <strong>Disconnect Your Wallet</strong> — terminate your session at
            any time by disconnecting your Stellar wallet.
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes
          in our practices or applicable laws. We will notify you of material
          changes by email or by posting a prominent notice on the platform. Your
          continued use of Stelo after changes are posted constitutes acceptance
          of the updated policy.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p>
          If you have questions, concerns, or requests regarding this Privacy
          Policy or our data practices, contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}

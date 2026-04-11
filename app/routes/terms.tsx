import type { MetaFunction } from "@remix-run/node";
import { pageMeta } from "~/lib/seo";
import { LegalLayout, Section } from "~/components/legal/LegalLayout";

export const meta: MetaFunction = () =>
  pageMeta({
    title: "Terms of Service",
    description:
      "Terms and conditions for using the Stelo print-on-demand platform.",
    path: "/terms",
  });

const CONTACT_EMAIL = "xuantruongdeveloper0911@gmail.com";

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" updated="April 11, 2026">
      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using Stelo ("the Platform"), you agree to be bound by
          these Terms of Service ("Terms"). If you do not agree to these Terms,
          you may not access or use the Platform. These Terms constitute a
          legally binding agreement between you and Stelo.
        </p>
      </Section>

      <Section title="2. Service Description">
        <p>
          Stelo is a print-on-demand (POD) platform that connects Shopify
          merchants with print providers, powered by the Stellar blockchain for
          payment processing. The Platform enables merchants to create custom
          products using a design editor, sync them with their Shopify store,
          and fulfill customer orders through a network of print providers. All
          payments are settled in USDC stablecoin via Soroban smart contract
          escrow.
        </p>
      </Section>

      <Section title="3. Account Requirements">
        <p>To use Stelo, you must:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Have a valid, active Shopify store with an installed Stelo app.</li>
          <li>
            Own a Stellar wallet capable of sending and receiving USDC (e.g.,
            Freighter browser extension).
          </li>
          <li>Be at least 18 years old or the legal age in your jurisdiction.</li>
          <li>
            Provide accurate information and maintain the security of your
            wallet credentials.
          </li>
        </ul>
        <p>
          You are solely responsible for the security of your private keys and
          wallet. Stelo never stores or has access to your private keys.
        </p>
      </Section>

      <Section title="4. Intellectual Property">
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Your Content</strong> — you retain full ownership of designs,
            images, and content you upload to Stelo. By uploading, you grant
            Stelo a non-exclusive, worldwide license to use your content solely
            for the purpose of fulfilling print-on-demand orders.
          </li>
          <li>
            <strong>Your Responsibility</strong> — you must have the legal
            rights to all content you upload. You may not upload content that
            infringes on copyrights, trademarks, or other intellectual property
            rights of third parties.
          </li>
          <li>
            <strong>Liability</strong> — Stelo is not responsible for
            intellectual property disputes between you and third parties. You
            agree to indemnify Stelo against any claims arising from your
            uploaded content.
          </li>
          <li>
            <strong>Platform IP</strong> — Stelo retains all rights to the
            platform code, branding, design system, and proprietary features.
          </li>
        </ul>
      </Section>

      <Section title="5. Payments & Escrow">
        <ul className="list-disc pl-6 space-y-2">
          <li>
            All payments are processed in USDC stablecoin on the Stellar
            network.
          </li>
          <li>
            Customer payment funds are held in a Soroban smart contract escrow
            until fulfillment conditions are met.
          </li>
          <li>
            <strong>Escrow release conditions:</strong> funds are released to
            the provider upon shipping confirmation, and profit is released to
            the merchant.
          </li>
          <li>
            A platform fee is deducted automatically before provider payout.
          </li>
          <li>
            Gas fees for Stellar network transactions are your responsibility as
            the transacting party.
          </li>
          <li>
            Stelo does not hold or custody funds outside of the transparent
            smart contract escrow.
          </li>
        </ul>
      </Section>

      <Section title="6. Print Providers">
        <p>
          Print providers on the Stelo platform are independent fulfillment
          partners, not employees or contractors of Stelo. While Stelo
          facilitates the connection between merchants and providers, please
          note:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Stelo does not guarantee print quality, color accuracy, or delivery
            timelines — these are the responsibility of the individual provider.
          </li>
          <li>
            Disputes between merchants and providers are mediated by Stelo
            through the escrow dispute mechanism, but are ultimately resolved
            between the parties involved.
          </li>
          <li>
            Provider availability, pricing, and capabilities may change without
            notice.
          </li>
        </ul>
      </Section>

      <Section title="7. Prohibited Content">
        <p>
          You may not upload, create, or distribute designs or content that:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Infringe on copyrights, trademarks, or other intellectual property
            rights.
          </li>
          <li>
            Contain hate speech, discriminatory content, or incite violence.
          </li>
          <li>
            Depict explicit sexual content, graphic violence, or illegal
            activities.
          </li>
          <li>Violate any applicable laws or regulations.</li>
        </ul>
        <p>
          Stelo reserves the right to remove any designs that violate these
          guidelines and to suspend or terminate accounts of repeat offenders
          without prior notice.
        </p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>
          Stelo is provided "as is" and "as available" without warranties of any
          kind. To the fullest extent permitted by law, Stelo is not liable for:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Print quality issues, color discrepancies, or production defects
            (provider responsibility).
          </li>
          <li>
            Stellar network downtime, transaction failures, or blockchain
            congestion.
          </li>
          <li>
            Shopify API changes, outages, or sync failures affecting your store.
          </li>
          <li>
            Loss of designs, data, or funds due to user error, wallet
            compromise, or circumstances beyond our control.
          </li>
          <li>
            Indirect, incidental, consequential, or punitive damages arising
            from your use of the Platform.
          </li>
        </ul>
      </Section>

      <Section title="9. Termination">
        <p>
          Stelo may suspend or terminate your access to the Platform at any time
          if you violate these Terms, engage in fraudulent activity, or act in a
          manner that damages the Platform or its users. You may close your
          account at any time by disconnecting your wallet and contacting us.
        </p>
        <p>
          Upon termination, any funds held in escrow will be released according
          to the smart contract logic — completed orders will be paid out, and
          pending disputes will be resolved through the standard dispute
          mechanism.
        </p>
      </Section>

      <Section title="10. Governing Law">
        <p>
          These Terms are governed by and construed in accordance with
          applicable law. Any disputes arising from or relating to these Terms
          or your use of the Platform will be resolved through binding
          arbitration, except where prohibited by law.
        </p>
      </Section>

      <Section title="11. Contact Us">
        <p>
          If you have questions about these Terms of Service, contact us at{" "}
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

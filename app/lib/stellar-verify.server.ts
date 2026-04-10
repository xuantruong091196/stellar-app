import { randomBytes, createHash } from "node:crypto";
import { Keypair, StrKey, hash } from "@stellar/stellar-sdk";

// ─── Sign-In With Stellar (server-side verification) ──────────────

/** 3-minute window for completing the sign-in handshake. */
export const NONCE_TTL_MS = 3 * 60 * 1000;

/** Create a fresh hex nonce (32 bytes). */
export function generateNonce(): string {
  return randomBytes(32).toString("hex");
}

/** Build the human-readable message the wallet will sign. */
export function buildSignInMessage({
  address,
  nonce,
  domain,
}: {
  address: string;
  nonce: string;
  domain: string;
}): string {
  return [
    `${domain} wants you to sign in with your Stellar account:`,
    address,
    "",
    "Issued by: Stelo — Mission Control",
    `Nonce: ${nonce}`,
    "",
    "By signing, you prove ownership of this wallet. No transactions are submitted.",
  ].join("\n");
}

/** Validate that a string is a well-formed Stellar G... public key. */
export function isValidStellarAddress(address: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}

/**
 * Verify an Ed25519 signature over the provided message using the wallet's
 * Stellar public key.
 *
 * Freighter's `signMessage` (v6) goes through `SUBMIT_BLOB` internally, which
 * in the extension applies Stellar's standard `hash()` (SHA-256) before the
 * Ed25519 signature. We try multiple candidate payloads because Freighter's
 * behaviour has shifted across versions and depending on the decorator used:
 *
 *   1. sha256(raw UTF-8 bytes)                       — current Freighter
 *   2. raw UTF-8 bytes                               — legacy / other wallets
 *   3. sha256("Stellar Signed Message:\n" + msg)     — SEP-style prefix
 *   4. sha256(sha256(raw))                           — double-hash fallback
 *
 * If any candidate verifies, the signature is considered valid.
 */
export function verifySignature({
  address,
  message,
  signatureBase64,
}: {
  address: string;
  message: string;
  signatureBase64: string;
}): boolean {
  if (!isValidStellarAddress(address)) return false;

  let signature: Buffer;
  try {
    signature = Buffer.from(signatureBase64, "base64");
  } catch {
    return false;
  }
  // Ed25519 signatures are always 64 bytes
  if (signature.length !== 64) {
    // eslint-disable-next-line no-console
    console.warn("[SIWS] unexpected signature length:", signature.length);
    return false;
  }

  try {
    const keypair = Keypair.fromPublicKey(address);
    const raw = Buffer.from(message, "utf8");

    const candidates: { label: string; bytes: Buffer }[] = [
      { label: "sha256(raw)", bytes: createHash("sha256").update(raw).digest() },
      { label: "raw", bytes: raw },
      {
        label: "stellar-hash(raw)",
        bytes: hash(raw),
      },
      {
        label: "sha256(SEP-prefix+raw)",
        bytes: createHash("sha256")
          .update(`Stellar Signed Message:\n${message}`, "utf8")
          .digest(),
      },
      {
        label: "sha256(sha256(raw))",
        bytes: createHash("sha256")
          .update(createHash("sha256").update(raw).digest())
          .digest(),
      },
    ];

    for (const c of candidates) {
      try {
        if (keypair.verify(c.bytes, signature)) {
          // eslint-disable-next-line no-console
          return true;
        }
      } catch {
        // try next candidate
      }
    }

    // eslint-disable-next-line no-console
    console.warn("[SIWS] all verify candidates failed", {
      messageLen: raw.length,
      messagePreview: message.slice(0, 80),
    });
    return false;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[SIWS] verify threw:", e);
    return false;
  }
}

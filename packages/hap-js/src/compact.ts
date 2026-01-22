/**
 * HAP Compact Format - space-efficient serialization for QR codes
 *
 * Format: HAP{version}.{id}.{type}.{method}.{to_name}.{to_domain}.{at}.{exp}.{iss}.{signature}
 *
 * Example:
 * HAP1.hap_abc123xyz456.human_effort.physical_mail.Acme%20Corp.acme.com.1706169600.1769241600.ballista.jobs.MEUCIQDx...
 */

import * as jose from "jose";
import type { KeyLike } from "jose";
import {
  HAP_COMPACT_REGEX,
  HAP_COMPACT_VERSION,
  HAP_VERSION,
  HapClaim,
  HapJwk,
  CompactVerificationResult,
  DecodedCompact,
} from "./types";

/**
 * Encode a string for use in compact format (URL-encode + encode dots)
 * Dots need special handling since they're our delimiter
 */
function encodeCompactField(str: string): string {
  return encodeURIComponent(str).replace(/\./g, "%2E");
}

/**
 * Decode a compact format field
 */
function decodeCompactField(str: string): string {
  return decodeURIComponent(str);
}

/**
 * Base64url encode bytes (no padding)
 */
function base64urlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Base64url decode to bytes
 */
function base64urlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert ISO 8601 timestamp to Unix epoch seconds
 */
function isoToUnix(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * Convert Unix epoch seconds to ISO 8601 timestamp
 */
function unixToIso(unix: number): string {
  return new Date(unix * 1000).toISOString();
}

/**
 * Get recipient name and domain from a claim
 */
function getRecipient(claim: HapClaim): { name: string; domain?: string } {
  if (claim.type === "recipient_commitment") {
    return claim.recipient;
  }
  // human_effort, physical_delivery, financial_commitment, content_attestation all have 'to'
  return (claim as { to: { name: string; domain?: string } }).to;
}

/**
 * Get method from a claim (if applicable)
 */
function getMethod(claim: HapClaim): string {
  if (claim.type === "recipient_commitment") {
    return claim.commitment;
  }
  return (claim as { method: string }).method;
}

/**
 * Encodes a HAP claim and signature into compact format
 * @param claim - The HAP claim to encode
 * @param signature - The Ed25519 signature bytes (64 bytes)
 * @returns Compact format string
 */
export function encodeCompact(claim: HapClaim, signature: Uint8Array): string {
  const recipient = getRecipient(claim);
  const method = getMethod(claim);

  // Encode fields that may contain dots or special characters
  const fields = [
    `HAP${HAP_COMPACT_VERSION}`,
    claim.id,
    claim.type,
    method,
    encodeCompactField(recipient.name),
    encodeCompactField(recipient.domain || ""),
    isoToUnix(claim.at).toString(),
    claim.exp ? isoToUnix(claim.exp).toString() : "0",
    encodeCompactField(claim.iss),
    base64urlEncode(signature),
  ];

  return fields.join(".");
}

/**
 * Decodes a compact format string into claim and signature
 * @param compact - The compact format string
 * @returns Decoded claim and signature
 * @throws Error if format is invalid
 */
export function decodeCompact(compact: string): DecodedCompact {
  if (!isValidCompact(compact)) {
    throw new Error("Invalid HAP Compact format");
  }

  const parts = compact.split(".");
  if (parts.length !== 10) {
    throw new Error("Invalid HAP Compact format: expected 10 fields");
  }

  const [
    version,
    id,
    type,
    method,
    encodedName,
    domain,
    atUnix,
    expUnix,
    iss,
    sigB64,
  ] = parts;

  if (version !== `HAP${HAP_COMPACT_VERSION}`) {
    throw new Error(`Unsupported compact version: ${version}`);
  }

  const name = decodeCompactField(encodedName);
  const decodedDomain = domain ? decodeCompactField(domain) : undefined;
  const at = unixToIso(parseInt(atUnix, 10));
  const exp = expUnix !== "0" ? unixToIso(parseInt(expUnix, 10)) : undefined;
  const signature = base64urlDecode(sigB64);
  const decodedIss = decodeCompactField(iss);

  // Build the claim based on type
  const baseClaim = {
    v: HAP_VERSION,
    id,
    at,
    iss: decodedIss,
    ...(exp && { exp }),
  };

  let claim: HapClaim;

  if (type === "recipient_commitment") {
    claim = {
      ...baseClaim,
      type: "recipient_commitment",
      recipient: { name, ...(decodedDomain && { domain: decodedDomain }) },
      commitment: method as HapClaim extends { commitment: infer C } ? C : never,
    } as HapClaim;
  } else {
    claim = {
      ...baseClaim,
      type: type as HapClaim["type"],
      method: method as HapClaim extends { method: infer M } ? M : never,
      to: { name, ...(decodedDomain && { domain: decodedDomain }) },
    } as HapClaim;
  }

  return { claim, signature };
}

/**
 * Validates if a string is a valid HAP Compact format
 * @param compact - The string to validate
 * @returns true if valid compact format
 */
export function isValidCompact(compact: string): boolean {
  return HAP_COMPACT_REGEX.test(compact);
}

/**
 * Builds the compact payload (everything before the signature)
 * This is what gets signed
 */
export function buildCompactPayload(claim: HapClaim): string {
  const recipient = getRecipient(claim);
  const method = getMethod(claim);

  const fields = [
    `HAP${HAP_COMPACT_VERSION}`,
    claim.id,
    claim.type,
    method,
    encodeCompactField(recipient.name),
    encodeCompactField(recipient.domain || ""),
    isoToUnix(claim.at).toString(),
    claim.exp ? isoToUnix(claim.exp).toString() : "0",
    encodeCompactField(claim.iss),
  ];

  return fields.join(".");
}

/**
 * Signs a claim and returns it in compact format
 * @param claim - The HAP claim to sign
 * @param privateKey - The Ed25519 private key
 * @returns Signed compact format string
 */
export async function signCompact(
  claim: HapClaim,
  privateKey: KeyLike,
): Promise<string> {
  const payload = buildCompactPayload(claim);
  const payloadBytes = new TextEncoder().encode(payload);

  // Sign using Ed25519
  const signature = await crypto.subtle.sign(
    "Ed25519",
    privateKey as CryptoKey,
    payloadBytes,
  );

  return payload + "." + base64urlEncode(new Uint8Array(signature));
}

/**
 * Verifies a compact format string using provided public keys
 * @param compact - The compact format string
 * @param publicKeys - Array of JWK public keys to try
 * @returns Verification result
 */
export async function verifyCompact(
  compact: string,
  publicKeys: HapJwk[],
): Promise<CompactVerificationResult> {
  try {
    if (!isValidCompact(compact)) {
      return { valid: false, error: "Invalid compact format" };
    }

    // Split to get payload and signature
    const lastDot = compact.lastIndexOf(".");
    const payload = compact.substring(0, lastDot);
    const sigB64 = compact.substring(lastDot + 1);
    const signature = base64urlDecode(sigB64);

    const payloadBytes = new TextEncoder().encode(payload);

    // Try each public key
    for (const jwk of publicKeys) {
      try {
        const publicKey = await jose.importJWK(jwk, "EdDSA");

        const isValid = await crypto.subtle.verify(
          "Ed25519",
          publicKey as CryptoKey,
          signature,
          payloadBytes,
        );

        if (isValid) {
          const { claim } = decodeCompact(compact);
          return { valid: true, claim };
        }
      } catch {
        // Try next key
        continue;
      }
    }

    return { valid: false, error: "Signature verification failed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: message };
  }
}

/**
 * Generates a verification URL with embedded compact claim
 * @param baseUrl - Base verification URL (e.g., "https://ballista.jobs/v")
 * @param compact - The compact format string
 * @returns URL with compact claim in query parameter
 */
export function generateVerificationUrl(
  baseUrl: string,
  compact: string,
): string {
  return `${baseUrl}?c=${encodeURIComponent(compact)}`;
}

/**
 * Extracts compact claim from a verification URL
 * @param url - The verification URL
 * @returns Compact string or null if not found
 */
export function extractCompactFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const compact = parsed.searchParams.get("c");
    if (compact && isValidCompact(compact)) {
      return compact;
    }
    return null;
  } catch {
    return null;
  }
}

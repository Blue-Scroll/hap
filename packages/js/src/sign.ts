/**
 * HAP claim signing functions (for Verification Authorities)
 */

import * as jose from "jose";
import type { KeyLike } from "jose";
import { VERSION, Claim, ClaimCost, SignOptions } from "./types";

/** Characters used for ID generation */
const ID_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a cryptographically secure random HAP ID
 * @returns A HAP ID in the format hap_[a-zA-Z0-9]{12}
 */
export function generateId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(12));
  let suffix = "";

  for (let i = 0; i < 12; i++) {
    suffix += ID_CHARS[randomBytes[i] % ID_CHARS.length];
  }

  return `hap_${suffix}`;
}

/**
 * Generates a test HAP ID (for previews and development)
 * @returns A test HAP ID in the format hap_test_[a-zA-Z0-9]{8}
 */
export function generateTestId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  let suffix = "";

  for (let i = 0; i < 8; i++) {
    suffix += ID_CHARS[randomBytes[i] % ID_CHARS.length];
  }

  return `hap_test_${suffix}`;
}

/**
 * Checks if a HAP ID is a test ID
 * @param id - The HAP ID to check
 * @returns true if the ID is a test ID
 */
export function isTestId(id: string): boolean {
  return /^hap_test_[a-zA-Z0-9]{8}$/.test(id);
}

/**
 * Generates a new Ed25519 key pair for signing HAP claims
 * @returns Object containing the public and private keys
 */
export async function generateKeyPair(): Promise<{
  publicKey: KeyLike;
  privateKey: KeyLike;
}> {
  const { publicKey, privateKey } = await jose.generateKeyPair("EdDSA", {
    crv: "Ed25519",
  });

  return { publicKey, privateKey };
}

/**
 * Exports a public key to JWK format suitable for /.well-known/hap.json
 * @param publicKey - The public key to export
 * @param kid - The key ID to assign
 * @returns JWK object
 */
export async function exportPublicKeyJwk(
  publicKey: KeyLike,
  kid: string,
): Promise<jose.JWK> {
  const jwk = await jose.exportJWK(publicKey);
  return {
    ...jwk,
    kid,
    kty: "OKP",
    crv: "Ed25519",
  };
}

/**
 * Signs a HAP claim with an Ed25519 private key
 * @param claim - The claim to sign
 * @param privateKey - The Ed25519 private key
 * @param options - Signing options (must include kid)
 * @returns JWS compact serialization string
 */
export async function signClaim(
  claim: Claim,
  privateKey: KeyLike,
  options: SignOptions,
): Promise<string> {
  // Ensure version is set
  const claimWithVersion = {
    ...claim,
    v: claim.v || VERSION,
  };

  const jws = await new jose.CompactSign(
    new TextEncoder().encode(JSON.stringify(claimWithVersion)),
  )
    .setProtectedHeader({
      alg: "EdDSA",
      kid: options.kid,
    })
    .sign(privateKey);

  return jws;
}

/**
 * Parameters for creating a HAP claim
 */
export interface CreateClaimParams {
  /** VA-specific verification method identifier */
  method: string;
  /** Human-readable description of the effort */
  description: string;
  /** Recipient name */
  recipientName: string;
  /** Recipient domain (optional) */
  domain?: string;
  /** Issuer domain (VA's domain) */
  issuer: string;
  /** Service tier (optional) */
  tier?: string;
  /** Days until expiration (optional) */
  expiresInDays?: number;

  // Effort dimensions (all optional)

  /** Monetary cost incurred */
  cost?: ClaimCost;
  /** Time in seconds of exclusive dedication */
  time?: number;
  /** Whether physical-world atoms were involved */
  physical?: boolean;
  /** Human energy expenditure in kilocalories */
  energy?: number;
}

/**
 * Creates a complete HAP claim with all required fields
 * @param params - Claim parameters
 * @returns A complete Claim object
 */
export function createClaim(params: CreateClaimParams): Claim {
  const now = new Date();
  const claim: Claim = {
    v: VERSION,
    id: generateId(),
    to: {
      name: params.recipientName,
      ...(params.domain && { domain: params.domain }),
    },
    at: now.toISOString(),
    iss: params.issuer,
    method: params.method,
    description: params.description,
  };

  if (params.tier) {
    claim.tier = params.tier;
  }

  if (params.expiresInDays) {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + params.expiresInDays);
    claim.exp = exp.toISOString();
  }

  // Add effort dimensions if provided
  if (params.cost) {
    claim.cost = params.cost;
  }

  if (params.time !== undefined) {
    claim.time = params.time;
  }

  if (params.physical !== undefined) {
    claim.physical = params.physical;
  }

  if (params.energy !== undefined) {
    claim.energy = params.energy;
  }

  return claim;
}

/**
 * Computes SHA-256 hash of content with prefix
 * @param content - The content to hash
 * @returns Hash string in format "sha256:xxxxx"
 */
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hashHex}`;
}

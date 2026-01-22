/**
 * HAP claim signing functions (for Verification Authorities)
 */

import * as jose from "jose";
import type { KeyLike } from "jose";
import { HAP_VERSION, HapClaim, SignOptions } from "./types";

/** Characters used for HAP ID generation */
const HAP_ID_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generates a cryptographically secure random HAP ID
 * @returns A HAP ID in the format hap_[a-zA-Z0-9]{12}
 */
export function generateHapId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(12));
  let suffix = "";

  for (let i = 0; i < 12; i++) {
    suffix += HAP_ID_CHARS[randomBytes[i] % HAP_ID_CHARS.length];
  }

  return `hap_${suffix}`;
}

/**
 * Generates a test HAP ID (for previews and development)
 * @returns A test HAP ID in the format hap_test_[a-zA-Z0-9]{8}
 */
export function generateTestHapId(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(8));
  let suffix = "";

  for (let i = 0; i < 8; i++) {
    suffix += HAP_ID_CHARS[randomBytes[i] % HAP_ID_CHARS.length];
  }

  return `hap_test_${suffix}`;
}

/**
 * Checks if a HAP ID is a test ID
 * @param id - The HAP ID to check
 * @returns true if the ID is a test ID
 */
export function isTestHapId(id: string): boolean {
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
  claim: HapClaim,
  privateKey: KeyLike,
  options: SignOptions,
): Promise<string> {
  // Ensure version is set
  const claimWithVersion = {
    ...claim,
    v: claim.v || HAP_VERSION,
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
 * Creates a complete human effort claim with all required fields
 * @param params - Claim parameters
 * @returns A complete HumanEffortClaim object
 */
export function createHumanEffortClaim(params: {
  method: string;
  recipientName: string;
  domain?: string;
  tier?: string;
  issuer: string;
  expiresInDays?: number;
}): HapClaim {
  const now = new Date();
  const claim: HapClaim = {
    v: HAP_VERSION,
    id: generateHapId(),
    type: "human_effort",
    method: params.method as HapClaim extends { method: infer M } ? M : never,
    to: {
      name: params.recipientName,
      ...(params.domain && { domain: params.domain }),
    },
    at: now.toISOString(),
    iss: params.issuer,
  };

  if (params.tier) {
    (claim as { tier?: string }).tier = params.tier;
  }

  if (params.expiresInDays) {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + params.expiresInDays);
    claim.exp = exp.toISOString();
  }

  return claim;
}

/**
 * Creates a complete recipient commitment claim with all required fields
 * @param params - Claim parameters
 * @returns A complete RecipientCommitmentClaim object
 */
export function createRecipientCommitmentClaim(params: {
  recipientName: string;
  recipientDomain?: string;
  commitment: string;
  issuer: string;
  expiresInDays?: number;
}): HapClaim {
  const now = new Date();
  const claim: HapClaim = {
    v: HAP_VERSION,
    id: generateHapId(),
    type: "recipient_commitment",
    recipient: {
      name: params.recipientName,
      ...(params.recipientDomain && { domain: params.recipientDomain }),
    },
    commitment: params.commitment as HapClaim extends { commitment: infer C }
      ? C
      : never,
    at: now.toISOString(),
    iss: params.issuer,
  };

  if (params.expiresInDays) {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + params.expiresInDays);
    claim.exp = exp.toISOString();
  }

  return claim;
}

/**
 * Creates a physical delivery claim (attests physical scarcity)
 * @param params - Claim parameters
 * @returns A complete PhysicalDeliveryClaim object
 */
export function createPhysicalDeliveryClaim(params: {
  method: string;
  recipientName: string;
  domain?: string;
  tier?: string;
  issuer: string;
  expiresInDays?: number;
}): HapClaim {
  const now = new Date();
  const claim: HapClaim = {
    v: HAP_VERSION,
    id: generateHapId(),
    type: "physical_delivery",
    method: params.method as HapClaim extends { method: infer M } ? M : never,
    to: {
      name: params.recipientName,
      ...(params.domain && { domain: params.domain }),
    },
    at: now.toISOString(),
    iss: params.issuer,
  };

  if (params.tier) {
    (claim as { tier?: string }).tier = params.tier;
  }

  if (params.expiresInDays) {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + params.expiresInDays);
    claim.exp = exp.toISOString();
  }

  return claim;
}

/**
 * Creates a financial commitment claim (attests monetary commitment)
 * @param params - Claim parameters
 * @returns A complete FinancialCommitmentClaim object
 */
export function createFinancialCommitmentClaim(params: {
  method: string;
  recipientName: string;
  domain?: string;
  tier?: string;
  issuer: string;
  expiresInDays?: number;
}): HapClaim {
  const now = new Date();
  const claim: HapClaim = {
    v: HAP_VERSION,
    id: generateHapId(),
    type: "financial_commitment",
    method: params.method as HapClaim extends { method: infer M } ? M : never,
    to: {
      name: params.recipientName,
      ...(params.domain && { domain: params.domain }),
    },
    at: now.toISOString(),
    iss: params.issuer,
  };

  if (params.tier) {
    (claim as { tier?: string }).tier = params.tier;
  }

  if (params.expiresInDays) {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + params.expiresInDays);
    claim.exp = exp.toISOString();
  }

  return claim;
}

/**
 * Creates a content attestation claim (sender attests to content truthfulness)
 * @param params - Claim parameters
 * @returns A complete ContentAttestationClaim object
 */
export function createContentAttestationClaim(params: {
  method: string;
  recipientName: string;
  domain?: string;
  tier?: string;
  issuer: string;
  expiresInDays?: number;
}): HapClaim {
  const now = new Date();
  const claim: HapClaim = {
    v: HAP_VERSION,
    id: generateHapId(),
    type: "content_attestation",
    method: params.method as HapClaim extends { method: infer M } ? M : never,
    to: {
      name: params.recipientName,
      ...(params.domain && { domain: params.domain }),
    },
    at: now.toISOString(),
    iss: params.issuer,
  };

  if (params.tier) {
    (claim as { tier?: string }).tier = params.tier;
  }

  if (params.expiresInDays) {
    const exp = new Date(now);
    exp.setDate(exp.getDate() + params.expiresInDays);
    claim.exp = exp.toISOString();
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

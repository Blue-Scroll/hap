/**
 * Human Attestation Protocol TypeScript type definitions
 */

/** Protocol version */
export const VERSION = "0.1";

/** Compact format version */
export const COMPACT_VERSION = "1";

/** ID format: hap_ followed by 12 alphanumeric characters */
export const ID_REGEX = /^hap_[a-zA-Z0-9]{12}$/;

/** Test ID format: hap_test_ followed by 8 alphanumeric characters */
export const TEST_ID_REGEX = /^hap_test_[a-zA-Z0-9]{8}$/;

/** Compact format regex - 9 dot-separated fields */
export const COMPACT_REGEX =
  /^HAP1\.hap_[a-zA-Z0-9_]+\.[^.]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$/;

/** Target recipient information */
export interface ClaimTarget {
  /** Recipient name */
  name: string;
  /** Recipient domain for unambiguous identification */
  domain?: string;
}

/** Monetary cost */
export interface ClaimCost {
  /** Amount in smallest currency unit (cents for USD, pence for GBP) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
}

/**
 * Claim - attests that a sender demonstrated costly effort to reach a recipient
 *
 * All effort dimensions (cost, time, physical, energy) are optional.
 * VAs populate the dimensions they can verify.
 */
export interface Claim {
  /** Protocol version */
  v: string;
  /** Unique ID */
  id: string;
  /** Target recipient */
  to: ClaimTarget;
  /** ISO 8601 timestamp of verification */
  at: string;
  /** ISO 8601 timestamp of claim expiration (optional) */
  exp?: string;
  /** Issuer domain (VA's domain) */
  iss: string;
  /** VA-specific verification type identifier */
  method: string;
  /** Human-readable description of the effort */
  description: string;
  /** Service tier (VA-specific, optional) */
  tier?: string;

  // Effort dimensions (all optional)

  /** Monetary cost incurred */
  cost?: ClaimCost;
  /** Time in seconds of exclusive dedication */
  time?: number;
  /** Whether physical-world atoms were involved */
  physical?: boolean;
  /** Human energy expenditure in kilocalories */
  energy?: number;

  /** VA-specific custom dimensions (x-* fields) */
  [key: `x-${string}`]: unknown;
}

/** Revocation reason codes */
export type RevocationReason = "fraud" | "error" | "legal" | "user_request";

/** JWK public key for Ed25519 */
export interface Jwk {
  /** Key ID */
  kid: string;
  /** Key type (always "OKP" for Ed25519) */
  kty: "OKP";
  /** Curve (always "Ed25519") */
  crv: "Ed25519";
  /** Base64url-encoded public key */
  x: string;
}

/** Response from /.well-known/hap.json */
export interface WellKnown {
  /** VA's domain */
  issuer: string;
  /** Array of public keys */
  keys: Jwk[];
}

/** Successful verification response */
export interface VerificationResponseValid {
  valid: true;
  id: string;
  claim: Claim;
  jws: string;
  issuer: string;
  verifyUrl: string;
}

/** Revoked claim response */
export interface VerificationResponseRevoked {
  valid: false;
  id: string;
  revoked: true;
  revocationReason: RevocationReason;
  revokedAt: string;
  issuer: string;
}

/** Not found response */
export interface VerificationResponseNotFound {
  valid: false;
  error: "not_found";
}

/** Invalid format response */
export interface VerificationResponseInvalidFormat {
  valid: false;
  error: "invalid_format";
}

/** Union of all verification response types */
export type VerificationResponse =
  | VerificationResponseValid
  | VerificationResponseRevoked
  | VerificationResponseNotFound
  | VerificationResponseInvalidFormat;

/** Options for verification functions */
export interface VerifyOptions {
  /** Custom fetch implementation (for testing or Node.js < 18) */
  fetch?: typeof fetch;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/** Options for signing functions */
export interface SignOptions {
  /** Key ID to include in JWS header */
  kid: string;
}

/** Result of signature verification */
export interface SignatureVerificationResult {
  /** Whether signature is valid */
  valid: boolean;
  /** Decoded claim payload (if valid) */
  claim?: Claim;
  /** Error message (if invalid) */
  error?: string;
}

/** Result of compact format verification */
export interface CompactVerificationResult {
  /** Whether verification is valid */
  valid: boolean;
  /** Decoded claim (if valid) */
  claim?: Claim;
  /** Error message (if invalid) */
  error?: string;
}

/** Decoded compact format data */
export interface DecodedCompact {
  /** Decoded claim */
  claim: Claim;
  /** Raw signature bytes */
  signature: Uint8Array;
}

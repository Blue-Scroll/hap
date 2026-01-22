/**
 * HAP (Human Attestation Protocol) TypeScript type definitions
 */

/** Protocol version */
export const HAP_VERSION = "0.1";

/** HAP Compact format version */
export const HAP_COMPACT_VERSION = "1";

/** HAP ID format: hap_ followed by 12 alphanumeric characters */
export const HAP_ID_REGEX = /^hap_[a-zA-Z0-9]{12}$/;

/** Test HAP ID format: hap_test_ followed by 8 alphanumeric characters */
export const HAP_TEST_ID_REGEX = /^hap_test_[a-zA-Z0-9]{8}$/;

/** HAP Compact format regex - 10 dot-separated fields with URL-encoded values (dots encoded as %2E) */
export const HAP_COMPACT_REGEX =
  /^HAP1\.hap_[a-zA-Z0-9_]+\.[a-z_]+\.[a-z_]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$/;

/** Core verification methods defined by HAP spec */
export type CoreVerificationMethod =
  | "physical_mail"
  | "video_interview"
  | "paid_assessment"
  | "referral"
  | "payment"
  | "truthfulness_confirmation";

/** Custom verification methods (x- prefix) */
export type CustomVerificationMethod = `x-${string}`;

/** All verification methods */
export type VerificationMethod =
  | CoreVerificationMethod
  | CustomVerificationMethod;

/** Claim types */
export type ClaimType =
  | "human_effort"
  | "recipient_commitment"
  | "physical_delivery"
  | "financial_commitment"
  | "content_attestation";

/** Recipient commitment levels */
export type CommitmentLevel =
  | "review_verified"
  | "prioritize_verified"
  | "respond_verified"
  | `x-${string}`;

/** Target recipient information */
export interface ClaimTarget {
  /** Recipient name */
  name: string;
  /** Recipient domain for unambiguous identification */
  domain?: string;
}

/** Recipient information for recipient_commitment claims */
export interface RecipientInfo {
  /** Recipient name */
  name: string;
  /** Recipient domain */
  domain?: string;
}

/** Base claim fields shared by all claim types */
export interface BaseHapClaim {
  /** Protocol version */
  v: string;
  /** Unique HAP ID */
  id: string;
  /** Claim type */
  type: ClaimType;
  /** ISO 8601 timestamp of verification */
  at: string;
  /** ISO 8601 timestamp of claim expiration (optional) */
  exp?: string;
  /** Issuer domain (VA's domain) */
  iss: string;
}

/** Human effort verification claim */
export interface HumanEffortClaim extends BaseHapClaim {
  type: "human_effort";
  /** Verification method used */
  method: VerificationMethod;
  /** Service tier (VA-specific) */
  tier?: string;
  /** Target recipient */
  to: ClaimTarget;
}

/** Recipient commitment claim */
export interface RecipientCommitmentClaim extends BaseHapClaim {
  type: "recipient_commitment";
  /** Recipient information */
  recipient: RecipientInfo;
  /** Commitment level */
  commitment: CommitmentLevel;
}

/** Physical delivery claim - attests physical scarcity/delivery */
export interface PhysicalDeliveryClaim extends BaseHapClaim {
  type: "physical_delivery";
  /** Verification method used */
  method: VerificationMethod;
  /** Service tier (VA-specific) */
  tier?: string;
  /** Target recipient */
  to: ClaimTarget;
}

/** Financial commitment claim - attests monetary commitment */
export interface FinancialCommitmentClaim extends BaseHapClaim {
  type: "financial_commitment";
  /** Verification method used */
  method: VerificationMethod;
  /** Service tier (VA-specific) */
  tier?: string;
  /** Target recipient */
  to: ClaimTarget;
}

/** Content attestation claim - sender attests to content truthfulness */
export interface ContentAttestationClaim extends BaseHapClaim {
  type: "content_attestation";
  /** Verification method used */
  method: VerificationMethod;
  /** Service tier (VA-specific) */
  tier?: string;
  /** Target recipient */
  to: ClaimTarget;
}

/** Union of all HAP claim types */
export type HapClaim =
  | HumanEffortClaim
  | RecipientCommitmentClaim
  | PhysicalDeliveryClaim
  | FinancialCommitmentClaim
  | ContentAttestationClaim;

/** Revocation reason codes */
export type RevocationReason = "fraud" | "error" | "legal" | "user_request";

/** JWK public key for Ed25519 */
export interface HapJwk {
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
export interface HapWellKnown {
  /** VA's domain */
  issuer: string;
  /** Array of public keys */
  keys: HapJwk[];
}

/** Successful verification response */
export interface VerificationResponseValid {
  valid: true;
  id: string;
  claims: HapClaim;
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
  claim?: HapClaim;
  /** Error message (if invalid) */
  error?: string;
}

/** Result of compact format verification */
export interface CompactVerificationResult {
  /** Whether verification is valid */
  valid: boolean;
  /** Decoded claim (if valid) */
  claim?: HapClaim;
  /** Error message (if invalid) */
  error?: string;
}

/** Decoded compact format data */
export interface DecodedCompact {
  /** Decoded claim */
  claim: HapClaim;
  /** Raw signature bytes */
  signature: Uint8Array;
}

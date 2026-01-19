/**
 * HAP (Human Application Protocol) TypeScript type definitions
 */

/** Protocol version */
export const HAP_VERSION = "0.1";

/** HAP ID format: hap_ followed by 12 alphanumeric characters */
export const HAP_ID_REGEX = /^hap_[a-zA-Z0-9]{12}$/;

/** Core verification methods defined by HAP spec */
export type CoreVerificationMethod =
  | "physical_mail"
  | "video_interview"
  | "paid_assessment"
  | "referral";

/** Custom verification methods (x- prefix) */
export type CustomVerificationMethod = `x-${string}`;

/** All verification methods */
export type VerificationMethod =
  | CoreVerificationMethod
  | CustomVerificationMethod;

/** Claim types */
export type ClaimType = "human_effort" | "employer_commitment";

/** Employer commitment levels */
export type CommitmentLevel =
  | "review_verified"
  | "prioritize_verified"
  | "respond_verified"
  | `x-${string}`;

/** Target company information */
export interface ClaimTarget {
  /** Company name */
  company: string;
  /** Company domain for unambiguous identification */
  domain?: string;
}

/** Employer information for employer_commitment claims */
export interface EmployerInfo {
  /** Employer name */
  name: string;
  /** Employer domain */
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
  /** Target company */
  to: ClaimTarget;
}

/** Employer commitment claim */
export interface EmployerCommitmentClaim extends BaseHapClaim {
  type: "employer_commitment";
  /** Employer information */
  employer: EmployerInfo;
  /** Commitment level */
  commitment: CommitmentLevel;
}

/** Union of all HAP claim types */
export type HapClaim = HumanEffortClaim | EmployerCommitmentClaim;

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

/**
 * human-attestation - Official HAP (Human Attestation Protocol) SDK
 *
 * HAP is an open standard for verified human effort. This SDK provides
 * tools for both verifying HAP claims (for recipients) and signing claims
 * (for Verification Authorities).
 *
 * @example Verifying a claim (for recipients)
 * ```typescript
 * import { verifyClaim, isClaimExpired } from "human-attestation";
 *
 * const claim = await verifyClaim("hap_abc123xyz456", "ballista.jobs");
 * if (claim && !isClaimExpired(claim)) {
 *   console.log(`Verified application to ${claim.to.name}`);
 * }
 * ```
 *
 * @example Signing a claim (for VAs)
 * ```typescript
 * import { generateKeyPair, signClaim, createClaim } from "human-attestation";
 *
 * const { privateKey } = await generateKeyPair();
 * const claim = createClaim({
 *   method: "ba_priority_mail",
 *   description: "Priority mail packet with handwritten cover letter",
 *   recipientName: "Acme Corp",
 *   domain: "acme.com",
 *   issuer: "my-va.com",
 *   cost: { amount: 1500, currency: "USD" },
 *   time: 1800,
 *   physical: true,
 * });
 * const jws = await signClaim(claim, privateKey, { kid: "key_001" });
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  ClaimCost,
  ClaimTarget,
  CompactVerificationResult,
  DecodedCompact,
  Claim,
  Jwk,
  WellKnown,
  RevocationReason,
  SignatureVerificationResult,
  SignOptions,
  VerificationResponse,
  VerificationResponseInvalidFormat,
  VerificationResponseNotFound,
  VerificationResponseRevoked,
  VerificationResponseValid,
  VerifyOptions,
} from "./types";

export {
  COMPACT_REGEX,
  COMPACT_VERSION,
  ID_REGEX,
  TEST_ID_REGEX,
  VERSION,
} from "./types";

// Verification functions (for recipients)
export {
  extractIdFromUrl,
  fetchClaim,
  fetchPublicKeys,
  isClaimExpired,
  isClaimForRecipient,
  isValidId,
  verifyClaim,
  verifySignature,
} from "./verify";

// Signing functions (for VAs)
export {
  createClaim,
  exportPublicKeyJwk,
  generateId,
  generateKeyPair,
  generateTestId,
  hashContent,
  isTestId,
  signClaim,
} from "./sign";

export type { CreateClaimParams } from "./sign";

// Compact format functions (for QR codes and offline verification)
export {
  buildCompactPayload,
  decodeCompact,
  encodeCompact,
  extractCompactFromUrl,
  generateVerificationUrl,
  isValidCompact,
  signCompact,
  verifyCompact,
} from "./compact";

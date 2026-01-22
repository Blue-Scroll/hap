/**
 * human-attestation - Official HAP (Human Attestation Protocol) SDK
 *
 * HAP is an open standard for verified human effort. This SDK provides
 * tools for both verifying HAP claims (for recipients) and signing claims
 * (for Verification Authorities).
 *
 * @example Verifying a claim (for recipients)
 * ```typescript
 * import { verifyHapClaim, isClaimExpired } from "human-attestation";
 *
 * const claim = await verifyHapClaim("hap_abc123xyz456", "ballista.jobs");
 * if (claim && !isClaimExpired(claim)) {
 *   console.log(`Verified application to ${claim.to.name}`);
 * }
 * ```
 *
 * @example Signing a claim (for VAs)
 * ```typescript
 * import { generateKeyPair, signClaim, createHumanEffortClaim } from "human-attestation";
 *
 * const { privateKey } = await generateKeyPair();
 * const claim = createHumanEffortClaim({
 *   method: "physical_mail",
 *   recipientName: "Acme Corp",
 *   domain: "acme.com",
 *   issuer: "my-va.com",
 * });
 * const jws = await signClaim(claim, privateKey, { kid: "key_001" });
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  BaseHapClaim,
  ClaimTarget,
  ClaimType,
  CommitmentLevel,
  CompactVerificationResult,
  ContentAttestationClaim,
  CoreVerificationMethod,
  CustomVerificationMethod,
  DecodedCompact,
  FinancialCommitmentClaim,
  RecipientCommitmentClaim,
  RecipientInfo,
  HapClaim,
  HapJwk,
  HapWellKnown,
  HumanEffortClaim,
  PhysicalDeliveryClaim,
  RevocationReason,
  SignatureVerificationResult,
  SignOptions,
  VerificationMethod,
  VerificationResponse,
  VerificationResponseInvalidFormat,
  VerificationResponseNotFound,
  VerificationResponseRevoked,
  VerificationResponseValid,
  VerifyOptions,
} from "./types";

export {
  HAP_COMPACT_REGEX,
  HAP_COMPACT_VERSION,
  HAP_ID_REGEX,
  HAP_TEST_ID_REGEX,
  HAP_VERSION,
} from "./types";

// Verification functions (for recipients)
export {
  extractHapIdFromUrl,
  fetchClaim,
  fetchPublicKeys,
  isClaimExpired,
  isClaimForRecipient,
  isValidHapId,
  verifyHapClaim,
  verifySignature,
} from "./verify";

// Signing functions (for VAs)
export {
  createContentAttestationClaim,
  createFinancialCommitmentClaim,
  createHumanEffortClaim,
  createPhysicalDeliveryClaim,
  createRecipientCommitmentClaim,
  exportPublicKeyJwk,
  generateHapId,
  generateKeyPair,
  generateTestHapId,
  hashContent,
  isTestHapId,
  signClaim,
} from "./sign";

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

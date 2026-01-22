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
  CoreVerificationMethod,
  CustomVerificationMethod,
  RecipientCommitmentClaim,
  RecipientInfo,
  HapClaim,
  HapJwk,
  HapWellKnown,
  HumanEffortClaim,
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

export { HAP_ID_REGEX, HAP_VERSION } from "./types";

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
  createRecipientCommitmentClaim,
  createHumanEffortClaim,
  exportPublicKeyJwk,
  generateHapId,
  generateKeyPair,
  signClaim,
} from "./sign";

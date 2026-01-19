/**
 * @bluescroll/hap - Official HAP (Human Application Protocol) SDK
 *
 * HAP is an open standard for verified job applications. This SDK provides
 * tools for both verifying HAP claims (for employers) and signing claims
 * (for Verification Authorities).
 *
 * @example Verifying a claim (for employers)
 * ```typescript
 * import { verifyHapClaim, isClaimExpired } from "@bluescroll/hap";
 *
 * const claim = await verifyHapClaim("hap_abc123xyz456", "ballista.app");
 * if (claim && !isClaimExpired(claim)) {
 *   console.log(`Verified application to ${claim.to.company}`);
 * }
 * ```
 *
 * @example Signing a claim (for VAs)
 * ```typescript
 * import { generateKeyPair, signClaim, createHumanEffortClaim } from "@bluescroll/hap";
 *
 * const { privateKey } = await generateKeyPair();
 * const claim = createHumanEffortClaim({
 *   method: "physical_mail",
 *   company: "Acme Corp",
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
  EmployerCommitmentClaim,
  EmployerInfo,
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

// Verification functions (for employers)
export {
  extractHapIdFromUrl,
  fetchClaim,
  fetchPublicKeys,
  isClaimExpired,
  isClaimForCompany,
  isValidHapId,
  verifyHapClaim,
  verifySignature,
} from "./verify";

// Signing functions (for VAs)
export {
  createEmployerCommitmentClaim,
  createHumanEffortClaim,
  exportPublicKeyJwk,
  generateHapId,
  generateKeyPair,
  signClaim,
} from "./sign";

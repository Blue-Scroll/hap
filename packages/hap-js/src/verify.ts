/**
 * HAP claim verification functions
 */

import * as jose from "jose";
import {
  HAP_ID_REGEX,
  HapClaim,
  HapJwk,
  HapWellKnown,
  SignatureVerificationResult,
  VerificationResponse,
  VerifyOptions,
} from "./types";

/**
 * Validates a HAP ID format
 * @param id - The HAP ID to validate
 * @returns true if the ID matches the format hap_[a-zA-Z0-9]{12}
 */
export function isValidHapId(id: string): boolean {
  return HAP_ID_REGEX.test(id);
}

/**
 * Fetches the public keys from a VA's well-known endpoint
 * @param issuerDomain - The VA's domain (e.g., "ballista.io")
 * @param options - Optional configuration
 * @returns The VA's public key configuration
 */
export async function fetchPublicKeys(
  issuerDomain: string,
  options: VerifyOptions = {},
): Promise<HapWellKnown> {
  const fetchFn = options.fetch ?? fetch;
  const timeout = options.timeout ?? 10000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `https://${issuerDomain}/.well-known/hap.json`;
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch public keys: HTTP ${response.status}`);
    }

    return (await response.json()) as HapWellKnown;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches and verifies a HAP claim from a VA
 * @param hapId - The HAP ID to verify
 * @param issuerDomain - The VA's domain (e.g., "ballista.io")
 * @param options - Optional configuration
 * @returns The verification response from the VA
 */
export async function fetchClaim(
  hapId: string,
  issuerDomain: string,
  options: VerifyOptions = {},
): Promise<VerificationResponse> {
  if (!isValidHapId(hapId)) {
    return { valid: false, error: "invalid_format" };
  }

  const fetchFn = options.fetch ?? fetch;
  const timeout = options.timeout ?? 10000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `https://${issuerDomain}/api/v1/verify/${hapId}`;
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    return (await response.json()) as VerificationResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verifies a JWS signature against a VA's public keys
 * @param jws - The JWS compact serialization string
 * @param issuerDomain - The VA's domain to fetch public keys from
 * @param options - Optional configuration
 * @returns Verification result with decoded claim if valid
 */
export async function verifySignature(
  jws: string,
  issuerDomain: string,
  options: VerifyOptions = {},
): Promise<SignatureVerificationResult> {
  try {
    // Fetch public keys from the VA
    const wellKnown = await fetchPublicKeys(issuerDomain, options);

    // Parse the JWS header to get the key ID
    const header = jose.decodeProtectedHeader(jws);
    const kid = header.kid;

    if (!kid) {
      return { valid: false, error: "JWS header missing kid" };
    }

    // Find the matching key
    const jwk = wellKnown.keys.find((k: HapJwk) => k.kid === kid);
    if (!jwk) {
      return { valid: false, error: `Key not found: ${kid}` };
    }

    // Import the public key
    const publicKey = await jose.importJWK(jwk, "EdDSA");

    // Verify the signature
    const { payload } = await jose.compactVerify(jws, publicKey);

    // Decode the payload
    const claim = JSON.parse(new TextDecoder().decode(payload)) as HapClaim;

    // Verify the issuer matches
    if (claim.iss !== issuerDomain) {
      return {
        valid: false,
        error: `Issuer mismatch: expected ${issuerDomain}, got ${claim.iss}`,
      };
    }

    return { valid: true, claim };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { valid: false, error: message };
  }
}

/**
 * Fully verifies a HAP claim: fetches from VA and optionally verifies signature
 * @param hapId - The HAP ID to verify
 * @param issuerDomain - The VA's domain
 * @param options - Optional configuration
 * @returns The claim if valid, null if not found or invalid
 */
export async function verifyHapClaim(
  hapId: string,
  issuerDomain: string,
  options: VerifyOptions & { verifySignature?: boolean } = {},
): Promise<HapClaim | null> {
  // Fetch the claim from the VA
  const response = await fetchClaim(hapId, issuerDomain, options);

  // Check if valid
  if (!response.valid) {
    return null;
  }

  // Optionally verify the signature (recommended for high-security use cases)
  if (options.verifySignature !== false && "jws" in response) {
    const sigResult = await verifySignature(
      response.jws,
      issuerDomain,
      options,
    );
    if (!sigResult.valid) {
      return null;
    }
  }

  return "claims" in response ? response.claims : null;
}

/**
 * Extracts the HAP ID from a verification URL
 * @param url - The verification URL (e.g., "https://ballista.io/v/hap_abc123xyz456")
 * @returns The HAP ID or null if not found
 */
export function extractHapIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/");
    const lastPart = pathParts[pathParts.length - 1];

    if (isValidHapId(lastPart)) {
      return lastPart;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if a claim is expired
 * @param claim - The HAP claim to check
 * @returns true if the claim has an exp field and is expired
 */
export function isClaimExpired(claim: HapClaim): boolean {
  if (!claim.exp) {
    return false;
  }

  const expDate = new Date(claim.exp);
  return expDate < new Date();
}

/**
 * Checks if the claim target matches the expected company
 * @param claim - The HAP claim to check
 * @param companyDomain - The expected company domain
 * @returns true if the claim's target domain matches
 */
export function isClaimForCompany(
  claim: HapClaim,
  companyDomain: string,
): boolean {
  if (claim.type === "human_effort") {
    return claim.to.domain === companyDomain;
  }
  if (claim.type === "employer_commitment") {
    return claim.employer.domain === companyDomain;
  }
  return false;
}

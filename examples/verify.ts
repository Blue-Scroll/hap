/**
 * Example: Verify a HAP claim
 *
 * This demonstrates how to verify a HAP verification claim
 * using the jose library.
 *
 * Usage:
 *   npx tsx verify.ts <hap_id> [--issuer <domain>]
 *
 * Examples:
 *   npx tsx verify.ts hap_abc123xyz456
 *   npx tsx verify.ts hap_abc123xyz456 --issuer ballista.jobs
 */

import * as jose from "jose";

interface Claim {
  v: string;
  id: string;
  type: string;
  method: string;
  tier?: string;
  to: {
    name: string;
    domain?: string;
  };
  at: string;
  exp?: string;
  iss: string;
}

interface VerifyResponse {
  valid: boolean;
  id?: string;
  claims?: Claim;
  jws?: string;
  issuer?: string;
  verifyUrl?: string;
  error?: string;
  // Revocation fields
  revoked?: boolean;
  revocationReason?: "fraud" | "error" | "legal" | "user_request";
  revokedAt?: string;
}

interface PublicKeyResponse {
  issuer: string;
  keys: jose.JWK[];
}

/**
 * Fetch verification claim from a VA
 */
async function fetchClaim(
  hapId: string,
  issuerDomain: string,
): Promise<VerifyResponse> {
  const url = `https://${issuerDomain}/api/v1/verify/${hapId}`;
  const response = await fetch(url);

  if (!response.ok) {
    return { valid: false, error: "not_found" };
  }

  return response.json();
}

/**
 * Fetch public keys from a VA
 */
async function fetchPublicKeys(
  issuerDomain: string,
): Promise<PublicKeyResponse> {
  const url = `https://${issuerDomain}/.well-known/hap.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch public keys from ${issuerDomain}`);
  }

  return response.json();
}

/**
 * Verify the cryptographic signature of a HAP claim
 */
async function verifySignature(
  jws: string,
  issuerDomain: string,
): Promise<Claim> {
  // Fetch public keys from the issuer
  const { keys } = await fetchPublicKeys(issuerDomain);

  // Parse JWS header to get the key ID
  const header = jose.decodeProtectedHeader(jws);
  const { kid } = header;

  if (!kid) {
    throw new Error("JWS header missing kid");
  }

  // Find the matching key
  const jwk = keys.find((k) => k.kid === kid);

  if (!jwk) {
    throw new Error(`Key ${kid} not found in issuer's public keys`);
  }

  // Import the public key
  const publicKey = await jose.importJWK(jwk, "EdDSA");

  // Verify the signature
  const { payload } = await jose.compactVerify(jws, publicKey);

  // Decode and return the claim
  const claim = JSON.parse(new TextDecoder().decode(payload));
  return claim as Claim;
}

/**
 * Full verification flow
 */
async function verifyClaim(
  hapId: string,
  issuerDomain: string,
): Promise<void> {
  console.log(`Verifying HAP claim: ${hapId}`);
  console.log(`Issuer: ${issuerDomain}`);
  console.log("");

  // Step 1: Fetch the claim
  console.log("1. Fetching claim...");
  const response = await fetchClaim(hapId, issuerDomain);

  // Handle revoked claims
  if (response.revoked) {
    console.log("   CLAIM REVOKED");
    console.log(`   Reason: ${response.revocationReason}`);
    console.log(`   Revoked at: ${response.revokedAt}`);
    console.log("");
    console.log("This claim is no longer valid.");
    return;
  }

  if (!response.valid) {
    console.log(`   Claim not found or invalid: ${response.error}`);
    return;
  }

  console.log("   Claim found!");
  console.log(`   Company: ${response.claims?.to.name}`);
  if (response.claims?.to.domain) {
    console.log(`   Domain: ${response.claims.to.domain}`);
  }
  console.log(`   Method: ${response.claims?.method}`);
  console.log(`   Timestamp: ${response.claims?.at}`);
  if (response.claims?.exp) {
    console.log(`   Expires: ${response.claims.exp}`);
  }
  console.log("");

  // Step 2: Verify the cryptographic signature
  console.log("2. Verifying signature...");
  try {
    const verifiedClaim = await verifySignature(response.jws!, issuerDomain);
    console.log("   Signature valid!");
    console.log("");

    // Step 3: Validate claim matches
    console.log("3. Validating claim integrity...");
    if (verifiedClaim.id !== hapId) {
      console.log("   ERROR: Claim ID mismatch!");
      return;
    }
    console.log("   Claim ID matches!");

    if (verifiedClaim.iss !== issuerDomain) {
      console.log("   ERROR: Issuer mismatch!");
      return;
    }
    console.log("   Issuer matches!");
    console.log("");

    console.log("VERIFICATION COMPLETE");
    console.log("This is a valid HAP claim.");
    console.log("");
    console.log("Verified details:");
    console.log(`  - Company: ${verifiedClaim.to.name}`);
    if (verifiedClaim.to.domain) {
      console.log(`  - Domain: ${verifiedClaim.to.domain}`);
    }
    console.log(`  - Method: ${verifiedClaim.method}`);
    console.log(`  - Tier: ${verifiedClaim.tier || "standard"}`);
    console.log(`  - Verified at: ${verifiedClaim.at}`);
    if (verifiedClaim.exp) {
      console.log(`  - Expires: ${verifiedClaim.exp}`);
    }
    console.log(`  - Issuer: ${verifiedClaim.iss}`);
  } catch (error) {
    console.log(`   Signature verification failed: ${error}`);
    return;
  }
}

// CLI entry point
function parseArgs(): { hapId: string; issuer: string } {
  const args = process.argv.slice(2);
  let hapId = "";
  let issuer = "ballista.jobs"; // Default issuer

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--issuer" && args[i + 1]) {
      issuer = args[i + 1];
      i++; // Skip the next argument
    } else if (!args[i].startsWith("--")) {
      hapId = args[i];
    }
  }

  return { hapId, issuer };
}

const { hapId, issuer } = parseArgs();

if (!hapId) {
  console.log("Usage: npx tsx verify.ts <hap_id> [--issuer <domain>]");
  console.log("");
  console.log("Examples:");
  console.log("  npx tsx verify.ts hap_abc123xyz456");
  console.log("  npx tsx verify.ts hap_abc123xyz456 --issuer ballista.jobs");
  process.exit(1);
}

if (!hapId.startsWith("hap_")) {
  console.log('Error: HAP ID must start with "hap_"');
  process.exit(1);
}

verifyClaim(hapId, issuer).catch(console.error);

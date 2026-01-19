/**
 * Example: Verify a HAP claim
 *
 * This demonstrates how to verify a HAP verification claim
 * using the jose library.
 *
 * Usage:
 *   npx tsx verify.ts hap_abc123xyz456
 */

import * as jose from 'jose'

interface HapClaim {
  v: string
  id: string
  type: string
  method: string
  tier?: string
  to: {
    company: string
  }
  at: string
  iss: string
}

interface HapVerifyResponse {
  valid: boolean
  id?: string
  claims?: HapClaim
  jws?: string
  issuer?: string
  verifyUrl?: string
  error?: string
}

interface HapPublicKeyResponse {
  issuer: string
  keys: jose.JWK[]
}

/**
 * Fetch verification claim from a VA
 */
async function fetchClaim(hapId: string, issuerDomain: string): Promise<HapVerifyResponse> {
  const url = `https://${issuerDomain}/api/v1/verify/${hapId}`
  const response = await fetch(url)

  if (!response.ok) {
    return { valid: false, error: 'not_found' }
  }

  return response.json()
}

/**
 * Fetch public keys from a VA
 */
async function fetchPublicKeys(issuerDomain: string): Promise<HapPublicKeyResponse> {
  const url = `https://${issuerDomain}/.well-known/hap.json`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch public keys from ${issuerDomain}`)
  }

  return response.json()
}

/**
 * Verify the cryptographic signature of a HAP claim
 */
async function verifySignature(jws: string, issuerDomain: string): Promise<HapClaim> {
  // Fetch public keys from the issuer
  const { keys } = await fetchPublicKeys(issuerDomain)

  // Parse JWS header to get the key ID
  const header = jose.decodeProtectedHeader(jws)
  const { kid } = header

  if (!kid) {
    throw new Error('JWS header missing kid')
  }

  // Find the matching key
  const jwk = keys.find((k) => k.kid === kid)

  if (!jwk) {
    throw new Error(`Key ${kid} not found in issuer's public keys`)
  }

  // Import the public key
  const publicKey = await jose.importJWK(jwk, 'EdDSA')

  // Verify the signature
  const { payload } = await jose.compactVerify(jws, publicKey)

  // Decode and return the claim
  const claim = JSON.parse(new TextDecoder().decode(payload))
  return claim as HapClaim
}

/**
 * Full verification flow
 */
async function verifyHapClaim(hapId: string): Promise<void> {
  // Extract issuer from HAP ID prefix or use default
  // In production, you'd either know the issuer or extract it from the verification URL
  const issuerDomain = 'ballista.app'

  console.log(`Verifying HAP claim: ${hapId}`)
  console.log(`Issuer: ${issuerDomain}`)
  console.log('')

  // Step 1: Fetch the claim
  console.log('1. Fetching claim...')
  const response = await fetchClaim(hapId, issuerDomain)

  if (!response.valid) {
    console.log(`   Claim not found or invalid: ${response.error}`)
    return
  }

  console.log('   Claim found!')
  console.log(`   Company: ${response.claims?.to.company}`)
  console.log(`   Method: ${response.claims?.method}`)
  console.log(`   Timestamp: ${response.claims?.at}`)
  console.log('')

  // Step 2: Verify the cryptographic signature
  console.log('2. Verifying signature...')
  try {
    const verifiedClaim = await verifySignature(response.jws!, issuerDomain)
    console.log('   Signature valid!')
    console.log('')

    // Step 3: Validate claim matches
    console.log('3. Validating claim integrity...')
    if (verifiedClaim.id !== hapId) {
      console.log('   ERROR: Claim ID mismatch!')
      return
    }
    console.log('   Claim ID matches!')

    if (verifiedClaim.iss !== issuerDomain) {
      console.log('   ERROR: Issuer mismatch!')
      return
    }
    console.log('   Issuer matches!')
    console.log('')

    console.log('VERIFICATION COMPLETE')
    console.log('This is a valid HAP claim.')
    console.log('')
    console.log('Verified details:')
    console.log(`  - Company: ${verifiedClaim.to.company}`)
    console.log(`  - Method: ${verifiedClaim.method}`)
    console.log(`  - Tier: ${verifiedClaim.tier || 'standard'}`)
    console.log(`  - Verified at: ${verifiedClaim.at}`)
    console.log(`  - Issuer: ${verifiedClaim.iss}`)
  } catch (error) {
    console.log(`   Signature verification failed: ${error}`)
    return
  }
}

// CLI entry point
const hapId = process.argv[2]

if (!hapId) {
  console.log('Usage: npx tsx verify.ts <hap_id>')
  console.log('Example: npx tsx verify.ts hap_abc123xyz456')
  process.exit(1)
}

if (!hapId.startsWith('hap_')) {
  console.log('Error: HAP ID must start with "hap_"')
  process.exit(1)
}

verifyHapClaim(hapId).catch(console.error)

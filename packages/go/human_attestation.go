// Package humanattestation provides the official HAP (Human Attestation Protocol) SDK for Go.
//
// HAP is an open standard for verified human effort. It enables Verification
// Authorities (VAs) to cryptographically attest that a sender took deliberate,
// costly action when communicating with a recipient.
//
// Example - Verifying a claim (for recipients):
//
//	claim, err := humanattestation.VerifyClaim(ctx, "hap_abc123xyz456", "ballista.jobs")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	if claim != nil && !humanattestation.IsClaimExpired(claim) {
//	    fmt.Printf("Verified application to %s\n", claim.To.Name)
//	}
//
// Example - Signing a claim (for VAs):
//
//	privateKey, publicKey, _ := humanattestation.GenerateKeyPair()
//	claim, _ := humanattestation.CreateClaim(humanattestation.CreateClaimParams{
//	    Method:        "ba_priority_mail",
//	    Description:   "Priority mail packet with handwritten cover letter",
//	    RecipientName: "Acme Corp",
//	    Domain:        "acme.com",
//	    Issuer:        "ballista.jobs",
//	    Cost:          &humanattestation.ClaimCost{Amount: 1500, Currency: "USD"},
//	    Time:          humanattestation.IntPtr(1800),
//	    Physical:      humanattestation.BoolPtr(true),
//	})
//	jws, _ := humanattestation.SignClaim(claim, privateKey, "key_001")
package humanattestation

import (
	"regexp"
)

// Version is the current protocol version
const Version = "0.1"

// CompactVersion is the compact format version
const CompactVersion = "1"

// IDRegex validates HAP ID format
var IDRegex = regexp.MustCompile(`^hap_[a-zA-Z0-9]{12}$`)

// TestIDRegex validates test HAP ID format
var TestIDRegex = regexp.MustCompile(`^hap_test_[a-zA-Z0-9]{8}$`)

// CompactRegex validates HAP Compact format (9 fields, no type)
var CompactRegex = regexp.MustCompile(`^HAP1\.hap_[a-zA-Z0-9_]+\.[^.]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$`)

// RevocationReason represents reasons for claim revocation
type RevocationReason string

const (
	RevocationFraud       RevocationReason = "fraud"
	RevocationError       RevocationReason = "error"
	RevocationLegal       RevocationReason = "legal"
	RevocationUserRequest RevocationReason = "user_request"
)

// ClaimTarget represents the target recipient
type ClaimTarget struct {
	Name   string `json:"name"`
	Domain string `json:"domain,omitempty"`
}

// ClaimCost represents monetary cost
type ClaimCost struct {
	Amount   int    `json:"amount"`   // Smallest currency unit (cents)
	Currency string `json:"currency"` // ISO 4217
}

// Claim represents a HAP claim with effort dimensions
type Claim struct {
	V           string      `json:"v"`
	ID          string      `json:"id"`
	To          ClaimTarget `json:"to"`
	At          string      `json:"at"`
	Iss         string      `json:"iss"`
	Method      string      `json:"method"`
	Description string      `json:"description"`
	Exp         string      `json:"exp,omitempty"`
	Tier        string      `json:"tier,omitempty"`
	Cost        *ClaimCost  `json:"cost,omitempty"`
	Time        *int        `json:"time,omitempty"`   // seconds
	Physical    *bool       `json:"physical,omitempty"`
	Energy      *int        `json:"energy,omitempty"` // kilocalories
}

// JWK represents a JWK public key for Ed25519
type JWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
}

// WellKnown represents the response from /.well-known/hap.json
type WellKnown struct {
	Issuer string `json:"issuer"`
	Keys   []JWK  `json:"keys"`
}

// VerificationResponse represents a response from the verification API
type VerificationResponse struct {
	Valid            bool             `json:"valid"`
	ID               string           `json:"id,omitempty"`
	Claim            *Claim           `json:"claim,omitempty"`
	JWS              string           `json:"jws,omitempty"`
	Issuer           string           `json:"issuer,omitempty"`
	VerifyURL        string           `json:"verifyUrl,omitempty"`
	Revoked          bool             `json:"revoked,omitempty"`
	RevocationReason RevocationReason `json:"revocationReason,omitempty"`
	RevokedAt        string           `json:"revokedAt,omitempty"`
	Error            string           `json:"error,omitempty"`
}

// SignatureVerificationResult represents the result of signature verification
type SignatureVerificationResult struct {
	Valid bool
	Claim *Claim
	Error string
}

// DecodedCompact represents a decoded compact format string
type DecodedCompact struct {
	Claim     *Claim
	Signature []byte
}

// CompactVerificationResult represents the result of compact format verification
type CompactVerificationResult struct {
	Valid bool
	Claim *Claim
	Error string
}

// IntPtr is a helper to create a pointer to an int
func IntPtr(i int) *int {
	return &i
}

// BoolPtr is a helper to create a pointer to a bool
func BoolPtr(b bool) *bool {
	return &b
}

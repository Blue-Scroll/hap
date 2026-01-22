// Package hap provides the official HAP (Human Attestation Protocol) SDK for Go.
//
// HAP is an open standard for verified human effort. It enables Verification
// Authorities (VAs) to cryptographically attest that a sender took deliberate,
// costly action when communicating with a recipient.
//
// Example - Verifying a claim (for employers):
//
//	claim, err := hap.VerifyHapClaim(ctx, "hap_abc123xyz456", "ballista.jobs")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	if claim != nil && !hap.IsClaimExpired(claim) {
//	    fmt.Printf("Verified application to %s\n", claim.To.Company)
//	}
//
// Example - Signing a claim (for VAs):
//
//	privateKey, publicKey, _ := hap.GenerateKeyPair()
//	claim := hap.CreateHumanEffortClaim(hap.HumanEffortClaimParams{
//	    Method:  "physical_mail",
//	    Company: "Acme Corp",
//	    Domain:  "acme.com",
//	    Issuer:  "my-va.com",
//	})
//	jws, _ := hap.SignClaim(claim, privateKey, "key_001")
package hap

import (
	"regexp"
)

// HAPVersion is the current protocol version
const HAPVersion = "0.1"

// HAPIDRegex validates HAP ID format
var HAPIDRegex = regexp.MustCompile(`^hap_[a-zA-Z0-9]{12}$`)

// ClaimType represents the type of HAP claim
type ClaimType string

const (
	ClaimTypeHumanEffort        ClaimType = "human_effort"
	ClaimTypeEmployerCommitment ClaimType = "employer_commitment"
)

// VerificationMethod represents core verification methods
type VerificationMethod string

const (
	MethodPhysicalMail   VerificationMethod = "physical_mail"
	MethodVideoInterview VerificationMethod = "video_interview"
	MethodPaidAssessment VerificationMethod = "paid_assessment"
	MethodReferral       VerificationMethod = "referral"
)

// CommitmentLevel represents employer commitment levels
type CommitmentLevel string

const (
	CommitmentReviewVerified    CommitmentLevel = "review_verified"
	CommitmentPrioritizeVerified CommitmentLevel = "prioritize_verified"
	CommitmentRespondVerified   CommitmentLevel = "respond_verified"
)

// RevocationReason represents reasons for claim revocation
type RevocationReason string

const (
	RevocationFraud       RevocationReason = "fraud"
	RevocationError       RevocationReason = "error"
	RevocationLegal       RevocationReason = "legal"
	RevocationUserRequest RevocationReason = "user_request"
)

// ClaimTarget represents the target company
type ClaimTarget struct {
	Company string `json:"company"`
	Domain  string `json:"domain,omitempty"`
}

// EmployerInfo represents employer information
type EmployerInfo struct {
	Name   string `json:"name"`
	Domain string `json:"domain,omitempty"`
}

// HumanEffortClaim represents a human effort verification claim
type HumanEffortClaim struct {
	V      string      `json:"v"`
	ID     string      `json:"id"`
	Type   ClaimType   `json:"type"`
	Method string      `json:"method"`
	Tier   string      `json:"tier,omitempty"`
	To     ClaimTarget `json:"to"`
	At     string      `json:"at"`
	Exp    string      `json:"exp,omitempty"`
	Iss    string      `json:"iss"`
}

// EmployerCommitmentClaim represents an employer commitment claim
type EmployerCommitmentClaim struct {
	V          string       `json:"v"`
	ID         string       `json:"id"`
	Type       ClaimType    `json:"type"`
	Employer   EmployerInfo `json:"employer"`
	Commitment string       `json:"commitment"`
	At         string       `json:"at"`
	Exp        string       `json:"exp,omitempty"`
	Iss        string       `json:"iss"`
}

// HapClaim is an interface for all HAP claim types
type HapClaim interface {
	GetID() string
	GetType() ClaimType
	GetAt() string
	GetExp() string
	GetIss() string
}

func (c *HumanEffortClaim) GetID() string      { return c.ID }
func (c *HumanEffortClaim) GetType() ClaimType { return c.Type }
func (c *HumanEffortClaim) GetAt() string      { return c.At }
func (c *HumanEffortClaim) GetExp() string     { return c.Exp }
func (c *HumanEffortClaim) GetIss() string     { return c.Iss }

func (c *EmployerCommitmentClaim) GetID() string      { return c.ID }
func (c *EmployerCommitmentClaim) GetType() ClaimType { return c.Type }
func (c *EmployerCommitmentClaim) GetAt() string      { return c.At }
func (c *EmployerCommitmentClaim) GetExp() string     { return c.Exp }
func (c *EmployerCommitmentClaim) GetIss() string     { return c.Iss }

// HapJWK represents a JWK public key for Ed25519
type HapJWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
}

// HapWellKnown represents the response from /.well-known/hap.json
type HapWellKnown struct {
	Issuer string   `json:"issuer"`
	Keys   []HapJWK `json:"keys"`
}

// VerificationResponse represents a response from the verification API
type VerificationResponse struct {
	Valid            bool             `json:"valid"`
	ID               string           `json:"id,omitempty"`
	Claims           *HumanEffortClaim `json:"claims,omitempty"`
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
	Claim *HumanEffortClaim
	Error string
}

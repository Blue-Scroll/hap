// Package hap provides the official HAP (Human Attestation Protocol) SDK for Go.
//
// HAP is an open standard for verified human effort. It enables Verification
// Authorities (VAs) to cryptographically attest that a sender took deliberate,
// costly action when communicating with a recipient.
//
// Example - Verifying a claim (for recipients):
//
//	claim, err := hap.VerifyHapClaim(ctx, "hap_abc123xyz456", "ballista.jobs")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	if claim != nil && !hap.IsClaimExpired(claim) {
//	    fmt.Printf("Verified application to %s\n", claim.To.Name)
//	}
//
// Example - Signing a claim (for VAs):
//
//	privateKey, publicKey, _ := hap.GenerateKeyPair()
//	claim := hap.CreateHumanEffortClaim(hap.HumanEffortClaimParams{
//	    Method:        "physical_mail",
//	    RecipientName: "Acme Corp",
//	    Domain:        "acme.com",
//	    Issuer:        "my-va.com",
//	})
//	jws, _ := hap.SignClaim(claim, privateKey, "key_001")
package hap

import (
	"regexp"
)

// HAPVersion is the current protocol version
const HAPVersion = "0.1"

// HAPCompactVersion is the compact format version
const HAPCompactVersion = "1"

// HAPIDRegex validates HAP ID format
var HAPIDRegex = regexp.MustCompile(`^hap_[a-zA-Z0-9]{12}$`)

// HAPTestIDRegex validates test HAP ID format
var HAPTestIDRegex = regexp.MustCompile(`^hap_test_[a-zA-Z0-9]{8}$`)

// HAPCompactRegex validates HAP Compact format
var HAPCompactRegex = regexp.MustCompile(`^HAP1\.hap_[a-zA-Z0-9_]+\.[a-z_]+\.[a-z_]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$`)

// ClaimType represents the type of HAP claim
type ClaimType string

const (
	ClaimTypeHumanEffort          ClaimType = "human_effort"
	ClaimTypeRecipientCommitment  ClaimType = "recipient_commitment"
	ClaimTypePhysicalDelivery     ClaimType = "physical_delivery"
	ClaimTypeFinancialCommitment  ClaimType = "financial_commitment"
	ClaimTypeContentAttestation   ClaimType = "content_attestation"
)

// VerificationMethod represents core verification methods
type VerificationMethod string

const (
	MethodPhysicalMail            VerificationMethod = "physical_mail"
	MethodVideoInterview          VerificationMethod = "video_interview"
	MethodPaidAssessment          VerificationMethod = "paid_assessment"
	MethodReferral                VerificationMethod = "referral"
	MethodPayment                 VerificationMethod = "payment"
	MethodTruthfulnessConfirmation VerificationMethod = "truthfulness_confirmation"
)

// CommitmentLevel represents recipient commitment levels
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

// ClaimTarget represents the target recipient
type ClaimTarget struct {
	Name   string `json:"name"`
	Domain string `json:"domain,omitempty"`
}

// RecipientInfo represents recipient information
type RecipientInfo struct {
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

// RecipientCommitmentClaim represents a recipient commitment claim
type RecipientCommitmentClaim struct {
	V          string        `json:"v"`
	ID         string        `json:"id"`
	Type       ClaimType     `json:"type"`
	Recipient  RecipientInfo `json:"recipient"`
	Commitment string        `json:"commitment"`
	At         string        `json:"at"`
	Exp        string        `json:"exp,omitempty"`
	Iss        string        `json:"iss"`
}

// PhysicalDeliveryClaim represents a physical delivery claim (attests physical scarcity)
type PhysicalDeliveryClaim struct {
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

// FinancialCommitmentClaim represents a financial commitment claim (attests monetary commitment)
type FinancialCommitmentClaim struct {
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

// ContentAttestationClaim represents a content attestation claim (sender attests to content truthfulness)
type ContentAttestationClaim struct {
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

func (c *RecipientCommitmentClaim) GetID() string      { return c.ID }
func (c *RecipientCommitmentClaim) GetType() ClaimType { return c.Type }
func (c *RecipientCommitmentClaim) GetAt() string      { return c.At }
func (c *RecipientCommitmentClaim) GetExp() string     { return c.Exp }
func (c *RecipientCommitmentClaim) GetIss() string     { return c.Iss }

func (c *PhysicalDeliveryClaim) GetID() string      { return c.ID }
func (c *PhysicalDeliveryClaim) GetType() ClaimType { return c.Type }
func (c *PhysicalDeliveryClaim) GetAt() string      { return c.At }
func (c *PhysicalDeliveryClaim) GetExp() string     { return c.Exp }
func (c *PhysicalDeliveryClaim) GetIss() string     { return c.Iss }

func (c *FinancialCommitmentClaim) GetID() string      { return c.ID }
func (c *FinancialCommitmentClaim) GetType() ClaimType { return c.Type }
func (c *FinancialCommitmentClaim) GetAt() string      { return c.At }
func (c *FinancialCommitmentClaim) GetExp() string     { return c.Exp }
func (c *FinancialCommitmentClaim) GetIss() string     { return c.Iss }

func (c *ContentAttestationClaim) GetID() string      { return c.ID }
func (c *ContentAttestationClaim) GetType() ClaimType { return c.Type }
func (c *ContentAttestationClaim) GetAt() string      { return c.At }
func (c *ContentAttestationClaim) GetExp() string     { return c.Exp }
func (c *ContentAttestationClaim) GetIss() string     { return c.Iss }

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

// DecodedCompact represents a decoded compact format string
type DecodedCompact struct {
	Claim     *GenericClaim
	Signature []byte
}

// CompactVerificationResult represents the result of compact format verification
type CompactVerificationResult struct {
	Valid bool
	Claim *GenericClaim
	Error string
}

// GenericClaim represents a claim with generic structure for compact format
type GenericClaim struct {
	V      string      `json:"v"`
	ID     string      `json:"id"`
	Type   ClaimType   `json:"type"`
	Method string      `json:"method,omitempty"`
	To     ClaimTarget `json:"to,omitempty"`
	At     string      `json:"at"`
	Exp    string      `json:"exp,omitempty"`
	Iss    string      `json:"iss"`
	// For recipient_commitment claims
	Recipient  RecipientInfo `json:"recipient,omitempty"`
	Commitment string        `json:"commitment,omitempty"`
	Tier       string        `json:"tier,omitempty"`
}

func (c *GenericClaim) GetID() string      { return c.ID }
func (c *GenericClaim) GetType() ClaimType { return c.Type }
func (c *GenericClaim) GetAt() string      { return c.At }
func (c *GenericClaim) GetExp() string     { return c.Exp }
func (c *GenericClaim) GetIss() string     { return c.Iss }

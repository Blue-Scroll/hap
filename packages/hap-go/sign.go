package hap

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-jose/go-jose/v4"
)

// HapIDChars contains characters used for HAP ID generation
const HapIDChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// GenerateHapID generates a cryptographically secure random HAP ID
func GenerateHapID() (string, error) {
	bytes := make([]byte, 12)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	suffix := make([]byte, 12)
	for i := 0; i < 12; i++ {
		suffix[i] = HapIDChars[int(bytes[i])%len(HapIDChars)]
	}

	return "hap_" + string(suffix), nil
}

// GenerateTestHapID generates a test HAP ID (for previews and development)
func GenerateTestHapID() (string, error) {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	suffix := make([]byte, 8)
	for i := 0; i < 8; i++ {
		suffix[i] = HapIDChars[int(bytes[i])%len(HapIDChars)]
	}

	return "hap_test_" + string(suffix), nil
}

// IsTestHapID checks if a HAP ID is a test ID
func IsTestHapID(id string) bool {
	return HAPTestIDRegex.MatchString(id)
}

// HashContent computes SHA-256 hash of content with prefix
func HashContent(content string) string {
	hash := sha256.Sum256([]byte(content))
	return "sha256:" + hex.EncodeToString(hash[:])
}

// GenerateKeyPair generates a new Ed25519 key pair for signing HAP claims
func GenerateKeyPair() (ed25519.PrivateKey, ed25519.PublicKey, error) {
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate key pair: %w", err)
	}
	return privateKey, publicKey, nil
}

// ExportPublicKeyJWK exports a public key to JWK format suitable for /.well-known/hap.json
func ExportPublicKeyJWK(publicKey ed25519.PublicKey, kid string) HapJWK {
	x := base64.RawURLEncoding.EncodeToString(publicKey)
	return HapJWK{
		Kid: kid,
		Kty: "OKP",
		Crv: "Ed25519",
		X:   x,
	}
}

// SignClaim signs a HAP claim with an Ed25519 private key
func SignClaim(claim interface{}, privateKey ed25519.PrivateKey, kid string) (string, error) {
	// Serialize the claim
	payload, err := json.Marshal(claim)
	if err != nil {
		return "", fmt.Errorf("failed to serialize claim: %w", err)
	}

	// Create the signer
	signer, err := jose.NewSigner(
		jose.SigningKey{Algorithm: jose.EdDSA, Key: privateKey},
		(&jose.SignerOptions{}).WithHeader("kid", kid),
	)
	if err != nil {
		return "", fmt.Errorf("failed to create signer: %w", err)
	}

	// Sign the payload
	jws, err := signer.Sign(payload)
	if err != nil {
		return "", fmt.Errorf("failed to sign claim: %w", err)
	}

	// Serialize to compact format
	compact, err := jws.CompactSerialize()
	if err != nil {
		return "", fmt.Errorf("failed to serialize JWS: %w", err)
	}

	return compact, nil
}

// HumanEffortClaimParams contains parameters for creating a human effort claim
type HumanEffortClaimParams struct {
	Method        string
	RecipientName string
	Domain        string
	Tier          string
	Issuer        string
	ExpiresInDays int
}

// CreateHumanEffortClaim creates a complete human effort claim with all required fields
func CreateHumanEffortClaim(params HumanEffortClaimParams) (*HumanEffortClaim, error) {
	id, err := GenerateHapID()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	claim := &HumanEffortClaim{
		V:      HAPVersion,
		ID:     id,
		Type:   ClaimTypeHumanEffort,
		Method: params.Method,
		To: ClaimTarget{
			Name:   params.RecipientName,
			Domain: params.Domain,
		},
		At:  now.Format(time.RFC3339),
		Iss: params.Issuer,
	}

	if params.Tier != "" {
		claim.Tier = params.Tier
	}

	if params.ExpiresInDays > 0 {
		exp := now.AddDate(0, 0, params.ExpiresInDays)
		claim.Exp = exp.Format(time.RFC3339)
	}

	return claim, nil
}

// RecipientCommitmentClaimParams contains parameters for creating a recipient commitment claim
type RecipientCommitmentClaimParams struct {
	RecipientName   string
	RecipientDomain string
	Commitment      string
	Issuer          string
	ExpiresInDays   int
}

// CreateRecipientCommitmentClaim creates a complete recipient commitment claim with all required fields
func CreateRecipientCommitmentClaim(params RecipientCommitmentClaimParams) (*RecipientCommitmentClaim, error) {
	id, err := GenerateHapID()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	claim := &RecipientCommitmentClaim{
		V:    HAPVersion,
		ID:   id,
		Type: ClaimTypeRecipientCommitment,
		Recipient: RecipientInfo{
			Name:   params.RecipientName,
			Domain: params.RecipientDomain,
		},
		Commitment: params.Commitment,
		At:         now.Format(time.RFC3339),
		Iss:        params.Issuer,
	}

	if params.ExpiresInDays > 0 {
		exp := now.AddDate(0, 0, params.ExpiresInDays)
		claim.Exp = exp.Format(time.RFC3339)
	}

	return claim, nil
}

// PhysicalDeliveryClaimParams contains parameters for creating a physical delivery claim
type PhysicalDeliveryClaimParams struct {
	Method        string
	RecipientName string
	Domain        string
	Tier          string
	Issuer        string
	ExpiresInDays int
}

// CreatePhysicalDeliveryClaim creates a physical delivery claim (attests physical scarcity)
func CreatePhysicalDeliveryClaim(params PhysicalDeliveryClaimParams) (*PhysicalDeliveryClaim, error) {
	id, err := GenerateHapID()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	claim := &PhysicalDeliveryClaim{
		V:      HAPVersion,
		ID:     id,
		Type:   ClaimTypePhysicalDelivery,
		Method: params.Method,
		To: ClaimTarget{
			Name:   params.RecipientName,
			Domain: params.Domain,
		},
		At:  now.Format(time.RFC3339),
		Iss: params.Issuer,
	}

	if params.Tier != "" {
		claim.Tier = params.Tier
	}

	if params.ExpiresInDays > 0 {
		exp := now.AddDate(0, 0, params.ExpiresInDays)
		claim.Exp = exp.Format(time.RFC3339)
	}

	return claim, nil
}

// FinancialCommitmentClaimParams contains parameters for creating a financial commitment claim
type FinancialCommitmentClaimParams struct {
	Method        string
	RecipientName string
	Domain        string
	Tier          string
	Issuer        string
	ExpiresInDays int
}

// CreateFinancialCommitmentClaim creates a financial commitment claim (attests monetary commitment)
func CreateFinancialCommitmentClaim(params FinancialCommitmentClaimParams) (*FinancialCommitmentClaim, error) {
	id, err := GenerateHapID()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	claim := &FinancialCommitmentClaim{
		V:      HAPVersion,
		ID:     id,
		Type:   ClaimTypeFinancialCommitment,
		Method: params.Method,
		To: ClaimTarget{
			Name:   params.RecipientName,
			Domain: params.Domain,
		},
		At:  now.Format(time.RFC3339),
		Iss: params.Issuer,
	}

	if params.Tier != "" {
		claim.Tier = params.Tier
	}

	if params.ExpiresInDays > 0 {
		exp := now.AddDate(0, 0, params.ExpiresInDays)
		claim.Exp = exp.Format(time.RFC3339)
	}

	return claim, nil
}

// ContentAttestationClaimParams contains parameters for creating a content attestation claim
type ContentAttestationClaimParams struct {
	Method        string
	RecipientName string
	Domain        string
	Tier          string
	Issuer        string
	ExpiresInDays int
}

// CreateContentAttestationClaim creates a content attestation claim (sender attests to content truthfulness)
func CreateContentAttestationClaim(params ContentAttestationClaimParams) (*ContentAttestationClaim, error) {
	id, err := GenerateHapID()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	claim := &ContentAttestationClaim{
		V:      HAPVersion,
		ID:     id,
		Type:   ClaimTypeContentAttestation,
		Method: params.Method,
		To: ClaimTarget{
			Name:   params.RecipientName,
			Domain: params.Domain,
		},
		At:  now.Format(time.RFC3339),
		Iss: params.Issuer,
	}

	if params.Tier != "" {
		claim.Tier = params.Tier
	}

	if params.ExpiresInDays > 0 {
		exp := now.AddDate(0, 0, params.ExpiresInDays)
		claim.Exp = exp.Format(time.RFC3339)
	}

	return claim, nil
}

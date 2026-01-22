package humanattestation

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

// IDChars contains characters used for HAP ID generation
const IDChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// GenerateID generates a cryptographically secure random HAP ID
func GenerateID() (string, error) {
	bytes := make([]byte, 12)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	suffix := make([]byte, 12)
	for i := 0; i < 12; i++ {
		suffix[i] = IDChars[int(bytes[i])%len(IDChars)]
	}

	return "hap_" + string(suffix), nil
}

// GenerateTestID generates a test HAP ID (for previews and development)
func GenerateTestID() (string, error) {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	suffix := make([]byte, 8)
	for i := 0; i < 8; i++ {
		suffix[i] = IDChars[int(bytes[i])%len(IDChars)]
	}

	return "hap_test_" + string(suffix), nil
}

// IsTestID checks if a HAP ID is a test ID
func IsTestID(id string) bool {
	return TestIDRegex.MatchString(id)
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
func ExportPublicKeyJWK(publicKey ed25519.PublicKey, kid string) JWK {
	x := base64.RawURLEncoding.EncodeToString(publicKey)
	return JWK{
		Kid: kid,
		Kty: "OKP",
		Crv: "Ed25519",
		X:   x,
	}
}

// SignClaim signs a HAP claim with an Ed25519 private key
func SignClaim(claim *Claim, privateKey ed25519.PrivateKey, kid string) (string, error) {
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

// CreateClaimParams contains parameters for creating a HAP claim
type CreateClaimParams struct {
	Method        string
	Description   string
	RecipientName string
	Domain        string
	Tier          string
	Issuer        string
	ExpiresInDays int
	Cost          *ClaimCost
	Time          *int
	Physical      *bool
	Energy        *int
}

// CreateClaim creates a complete HAP claim with all required fields
func CreateClaim(params CreateClaimParams) (*Claim, error) {
	id, err := GenerateID()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	claim := &Claim{
		V:           Version,
		ID:          id,
		Method:      params.Method,
		Description: params.Description,
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

	// Add effort dimensions if provided
	if params.Cost != nil {
		claim.Cost = params.Cost
	}

	if params.Time != nil {
		claim.Time = params.Time
	}

	if params.Physical != nil {
		claim.Physical = params.Physical
	}

	if params.Energy != nil {
		claim.Energy = params.Energy
	}

	return claim, nil
}

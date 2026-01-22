package humanattestation

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-jose/go-jose/v4"
)

// DefaultTimeout is the default HTTP request timeout
const DefaultTimeout = 10 * time.Second

// VerifyOptions configures verification behavior
type VerifyOptions struct {
	// HTTPClient allows using a custom HTTP client
	HTTPClient *http.Client
	// Timeout for HTTP requests (default: 10s)
	Timeout time.Duration
	// VerifySignature controls whether to verify the cryptographic signature
	VerifySignature bool
}

// DefaultVerifyOptions returns options with sensible defaults
func DefaultVerifyOptions() VerifyOptions {
	return VerifyOptions{
		HTTPClient:      http.DefaultClient,
		Timeout:         DefaultTimeout,
		VerifySignature: true,
	}
}

// IsValidID validates a HAP ID format
func IsValidID(id string) bool {
	return IDRegex.MatchString(id)
}

// FetchPublicKeys fetches the public keys from a VA's well-known endpoint
func FetchPublicKeys(ctx context.Context, issuerDomain string, opts VerifyOptions) (*WellKnown, error) {
	if opts.HTTPClient == nil {
		opts.HTTPClient = http.DefaultClient
	}
	if opts.Timeout == 0 {
		opts.Timeout = DefaultTimeout
	}

	ctx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()

	url := fmt.Sprintf("https://%s/.well-known/hap.json", issuerDomain)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := opts.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch public keys: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch public keys: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var wellKnown WellKnown
	if err := json.Unmarshal(body, &wellKnown); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &wellKnown, nil
}

// FetchClaim fetches and verifies a HAP claim from a VA
func FetchClaim(ctx context.Context, hapID, issuerDomain string, opts VerifyOptions) (*VerificationResponse, error) {
	if !IsValidID(hapID) {
		return &VerificationResponse{Valid: false, Error: "invalid_format"}, nil
	}

	if opts.HTTPClient == nil {
		opts.HTTPClient = http.DefaultClient
	}
	if opts.Timeout == 0 {
		opts.Timeout = DefaultTimeout
	}

	ctx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()

	url := fmt.Sprintf("https://%s/api/v1/verify/%s", issuerDomain, hapID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := opts.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch claim: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var verifyResp VerificationResponse
	if err := json.Unmarshal(body, &verifyResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &verifyResp, nil
}

// VerifySignature verifies a JWS signature against a VA's public keys
func VerifySignature(ctx context.Context, jwsString, issuerDomain string, opts VerifyOptions) (*SignatureVerificationResult, error) {
	// Fetch public keys
	wellKnown, err := FetchPublicKeys(ctx, issuerDomain, opts)
	if err != nil {
		return &SignatureVerificationResult{Valid: false, Error: err.Error()}, nil
	}

	// Parse the JWS
	jws, err := jose.ParseSigned(jwsString, []jose.SignatureAlgorithm{jose.EdDSA})
	if err != nil {
		return &SignatureVerificationResult{Valid: false, Error: fmt.Sprintf("failed to parse JWS: %v", err)}, nil
	}

	// Get the key ID from the header
	if len(jws.Signatures) == 0 {
		return &SignatureVerificationResult{Valid: false, Error: "no signatures in JWS"}, nil
	}
	kid := jws.Signatures[0].Header.KeyID
	if kid == "" {
		return &SignatureVerificationResult{Valid: false, Error: "JWS header missing kid"}, nil
	}

	// Find the matching key
	var jwk *JWK
	for _, k := range wellKnown.Keys {
		if k.Kid == kid {
			jwk = &k
			break
		}
	}
	if jwk == nil {
		return &SignatureVerificationResult{Valid: false, Error: fmt.Sprintf("key not found: %s", kid)}, nil
	}

	// Decode the public key
	xBytes, err := base64.RawURLEncoding.DecodeString(jwk.X)
	if err != nil {
		return &SignatureVerificationResult{Valid: false, Error: fmt.Sprintf("failed to decode public key: %v", err)}, nil
	}
	publicKey := ed25519.PublicKey(xBytes)

	// Verify the signature
	payload, err := jws.Verify(publicKey)
	if err != nil {
		return &SignatureVerificationResult{Valid: false, Error: fmt.Sprintf("signature verification failed: %v", err)}, nil
	}

	// Parse the payload
	var claim Claim
	if err := json.Unmarshal(payload, &claim); err != nil {
		return &SignatureVerificationResult{Valid: false, Error: fmt.Sprintf("failed to parse claim: %v", err)}, nil
	}

	// Verify issuer matches
	if claim.Iss != issuerDomain {
		return &SignatureVerificationResult{
			Valid: false,
			Error: fmt.Sprintf("issuer mismatch: expected %s, got %s", issuerDomain, claim.Iss),
		}, nil
	}

	return &SignatureVerificationResult{Valid: true, Claim: &claim}, nil
}

// VerifyClaim fully verifies a HAP claim: fetches from VA and optionally verifies signature
func VerifyClaim(ctx context.Context, hapID, issuerDomain string, opts ...VerifyOptions) (*Claim, error) {
	var opt VerifyOptions
	if len(opts) > 0 {
		opt = opts[0]
	} else {
		opt = DefaultVerifyOptions()
	}

	// Fetch the claim
	resp, err := FetchClaim(ctx, hapID, issuerDomain, opt)
	if err != nil {
		return nil, err
	}

	// Check if valid
	if !resp.Valid {
		return nil, nil
	}

	// Optionally verify the signature
	if opt.VerifySignature && resp.JWS != "" {
		sigResult, err := VerifySignature(ctx, resp.JWS, issuerDomain, opt)
		if err != nil {
			return nil, err
		}
		if !sigResult.Valid {
			return nil, nil
		}
	}

	return resp.Claim, nil
}

// ExtractIDFromURL extracts the HAP ID from a verification URL
func ExtractIDFromURL(urlStr string) string {
	parsed, err := url.Parse(urlStr)
	if err != nil {
		return ""
	}

	parts := strings.Split(parsed.Path, "/")
	if len(parts) == 0 {
		return ""
	}

	lastPart := parts[len(parts)-1]
	if IsValidID(lastPart) {
		return lastPart
	}

	return ""
}

// IsClaimExpired checks if a claim is expired
func IsClaimExpired(claim *Claim) bool {
	if claim.Exp == "" {
		return false
	}

	expTime, err := time.Parse(time.RFC3339, claim.Exp)
	if err != nil {
		return false
	}

	return expTime.Before(time.Now())
}

// IsClaimForRecipient checks if the claim target matches the expected recipient
func IsClaimForRecipient(claim *Claim, recipientDomain string) bool {
	return claim.To.Domain == recipientDomain
}

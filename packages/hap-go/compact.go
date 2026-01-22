package hap

import (
	"crypto/ed25519"
	"encoding/base64"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// encodeCompactField encodes a field for compact format (URL-encode + encode dots)
func encodeCompactField(value string) string {
	encoded := url.QueryEscape(value)
	return strings.ReplaceAll(encoded, ".", "%2E")
}

// decodeCompactField decodes a compact format field
func decodeCompactField(value string) (string, error) {
	return url.QueryUnescape(value)
}

// base64urlEncode encodes bytes to base64url without padding
func base64urlEncode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

// base64urlDecode decodes base64url string with padding restoration
func base64urlDecode(data string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(data)
}

// isoToUnix converts ISO 8601 timestamp to Unix epoch seconds
func isoToUnix(iso string) (int64, error) {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		return 0, err
	}
	return t.Unix(), nil
}

// unixToISO converts Unix epoch seconds to ISO 8601 timestamp
func unixToISO(unix int64) string {
	t := time.Unix(unix, 0).UTC()
	return t.Format(time.RFC3339)
}

// getRecipient returns the recipient info from a claim
func getRecipient(claim *GenericClaim) (name string, domain string) {
	if claim.Type == ClaimTypeRecipientCommitment {
		return claim.Recipient.Name, claim.Recipient.Domain
	}
	return claim.To.Name, claim.To.Domain
}

// getMethod returns the method from a claim (or commitment for recipient_commitment)
func getMethod(claim *GenericClaim) string {
	if claim.Type == ClaimTypeRecipientCommitment {
		return claim.Commitment
	}
	return claim.Method
}

// EncodeCompact encodes a HAP claim and signature into compact format
func EncodeCompact(claim *GenericClaim, signature []byte) (string, error) {
	name, domain := getRecipient(claim)
	method := getMethod(claim)

	atUnix, err := isoToUnix(claim.At)
	if err != nil {
		return "", fmt.Errorf("failed to parse 'at' timestamp: %w", err)
	}

	expUnix := int64(0)
	if claim.Exp != "" {
		expUnix, err = isoToUnix(claim.Exp)
		if err != nil {
			return "", fmt.Errorf("failed to parse 'exp' timestamp: %w", err)
		}
	}

	fields := []string{
		"HAP" + HAPCompactVersion,
		claim.ID,
		string(claim.Type),
		method,
		encodeCompactField(name),
		encodeCompactField(domain),
		strconv.FormatInt(atUnix, 10),
		strconv.FormatInt(expUnix, 10),
		encodeCompactField(claim.Iss),
		base64urlEncode(signature),
	}

	return strings.Join(fields, "."), nil
}

// DecodeCompact decodes a compact format string into claim and signature
func DecodeCompact(compact string) (*DecodedCompact, error) {
	if !IsValidCompact(compact) {
		return nil, fmt.Errorf("invalid HAP Compact format")
	}

	parts := strings.Split(compact, ".")
	if len(parts) != 10 {
		return nil, fmt.Errorf("invalid HAP Compact format: expected 10 fields, got %d", len(parts))
	}

	version := parts[0]
	hapID := parts[1]
	claimType := parts[2]
	method := parts[3]
	encodedName := parts[4]
	encodedDomain := parts[5]
	atUnixStr := parts[6]
	expUnixStr := parts[7]
	encodedIss := parts[8]
	sigB64 := parts[9]

	if version != "HAP"+HAPCompactVersion {
		return nil, fmt.Errorf("unsupported compact version: %s", version)
	}

	name, err := decodeCompactField(encodedName)
	if err != nil {
		return nil, fmt.Errorf("failed to decode name: %w", err)
	}

	domain, err := decodeCompactField(encodedDomain)
	if err != nil {
		return nil, fmt.Errorf("failed to decode domain: %w", err)
	}

	iss, err := decodeCompactField(encodedIss)
	if err != nil {
		return nil, fmt.Errorf("failed to decode issuer: %w", err)
	}

	atUnix, err := strconv.ParseInt(atUnixStr, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse 'at' timestamp: %w", err)
	}

	expUnix, err := strconv.ParseInt(expUnixStr, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse 'exp' timestamp: %w", err)
	}

	signature, err := base64urlDecode(sigB64)
	if err != nil {
		return nil, fmt.Errorf("failed to decode signature: %w", err)
	}

	at := unixToISO(atUnix)
	var exp string
	if expUnix != 0 {
		exp = unixToISO(expUnix)
	}

	claim := &GenericClaim{
		V:   HAPVersion,
		ID:  hapID,
		At:  at,
		Iss: iss,
	}

	if exp != "" {
		claim.Exp = exp
	}

	if ClaimType(claimType) == ClaimTypeRecipientCommitment {
		claim.Type = ClaimTypeRecipientCommitment
		claim.Recipient = RecipientInfo{Name: name}
		if domain != "" {
			claim.Recipient.Domain = domain
		}
		claim.Commitment = method
	} else {
		claim.Type = ClaimType(claimType)
		claim.Method = method
		claim.To = ClaimTarget{Name: name}
		if domain != "" {
			claim.To.Domain = domain
		}
	}

	return &DecodedCompact{
		Claim:     claim,
		Signature: signature,
	}, nil
}

// IsValidCompact validates if a string is a valid HAP Compact format
func IsValidCompact(compact string) bool {
	return HAPCompactRegex.MatchString(compact)
}

// BuildCompactPayload builds the compact payload (everything before the signature)
// This is what gets signed.
func BuildCompactPayload(claim *GenericClaim) (string, error) {
	name, domain := getRecipient(claim)
	method := getMethod(claim)

	atUnix, err := isoToUnix(claim.At)
	if err != nil {
		return "", fmt.Errorf("failed to parse 'at' timestamp: %w", err)
	}

	expUnix := int64(0)
	if claim.Exp != "" {
		expUnix, err = isoToUnix(claim.Exp)
		if err != nil {
			return "", fmt.Errorf("failed to parse 'exp' timestamp: %w", err)
		}
	}

	fields := []string{
		"HAP" + HAPCompactVersion,
		claim.ID,
		string(claim.Type),
		method,
		encodeCompactField(name),
		encodeCompactField(domain),
		strconv.FormatInt(atUnix, 10),
		strconv.FormatInt(expUnix, 10),
		encodeCompactField(claim.Iss),
	}

	return strings.Join(fields, "."), nil
}

// SignCompact signs a claim and returns it in compact format
func SignCompact(claim *GenericClaim, privateKey ed25519.PrivateKey) (string, error) {
	payload, err := BuildCompactPayload(claim)
	if err != nil {
		return "", err
	}

	signature := ed25519.Sign(privateKey, []byte(payload))
	return payload + "." + base64urlEncode(signature), nil
}

// VerifyCompact verifies a compact format string using provided public keys
func VerifyCompact(compact string, publicKeys []HapJWK) *CompactVerificationResult {
	if !IsValidCompact(compact) {
		return &CompactVerificationResult{Valid: false, Error: "Invalid compact format"}
	}

	// Split to get payload and signature
	lastDot := strings.LastIndex(compact, ".")
	payload := compact[:lastDot]
	sigB64 := compact[lastDot+1:]

	signature, err := base64urlDecode(sigB64)
	if err != nil {
		return &CompactVerificationResult{Valid: false, Error: fmt.Sprintf("failed to decode signature: %v", err)}
	}

	// Try each public key
	for _, jwk := range publicKeys {
		xBytes, err := base64.RawURLEncoding.DecodeString(jwk.X)
		if err != nil {
			continue
		}

		publicKey := ed25519.PublicKey(xBytes)

		// Verify signature
		if ed25519.Verify(publicKey, []byte(payload), signature) {
			// Signature is valid, decode the claim
			decoded, err := DecodeCompact(compact)
			if err != nil {
				return &CompactVerificationResult{Valid: false, Error: fmt.Sprintf("failed to decode claim: %v", err)}
			}
			return &CompactVerificationResult{Valid: true, Claim: decoded.Claim}
		}
	}

	return &CompactVerificationResult{Valid: false, Error: "Signature verification failed"}
}

// GenerateVerificationURL generates a verification URL with embedded compact claim
func GenerateVerificationURL(baseURL string, compact string) string {
	return baseURL + "?c=" + url.QueryEscape(compact)
}

// ExtractCompactFromURL extracts compact claim from a verification URL
func ExtractCompactFromURL(urlStr string) string {
	parsed, err := url.Parse(urlStr)
	if err != nil {
		return ""
	}

	compact := parsed.Query().Get("c")
	if compact != "" && IsValidCompact(compact) {
		return compact
	}

	return ""
}

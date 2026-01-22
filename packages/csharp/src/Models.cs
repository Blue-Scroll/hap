using System.Text.Json.Serialization;

namespace BlueScroll.HumanAttestation;

/// <summary>
/// Monetary cost of effort.
/// </summary>
public class ClaimCost
{
    /// <summary>Amount in smallest currency unit (e.g., cents)</summary>
    [JsonPropertyName("amount")]
    public int Amount { get; set; }

    /// <summary>ISO 4217 currency code</summary>
    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "USD";
}

/// <summary>
/// HAP claim - attestation of human effort.
/// </summary>
public class Claim
{
    [JsonPropertyName("v")]
    public string V { get; set; } = HumanAttestation.Version;

    [JsonPropertyName("id")]
    public string Id { get; set; } = HumanAttestation.GenerateId();

    [JsonPropertyName("to")]
    public ClaimTarget To { get; set; } = new();

    [JsonPropertyName("at")]
    public string At { get; set; } = DateTime.UtcNow.ToString("O");

    [JsonPropertyName("exp")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Exp { get; set; }

    [JsonPropertyName("iss")]
    public string Iss { get; set; } = string.Empty;

    /// <summary>VA-specific verification method identifier (SKU)</summary>
    [JsonPropertyName("method")]
    public string Method { get; set; } = string.Empty;

    /// <summary>Human-readable description of the effort</summary>
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Tier { get; set; }

    /// <summary>Monetary cost of the effort</summary>
    [JsonPropertyName("cost")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public ClaimCost? Cost { get; set; }

    /// <summary>Time in seconds of exclusive dedication</summary>
    [JsonPropertyName("time")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Time { get; set; }

    /// <summary>Whether physical-world atoms were involved</summary>
    [JsonPropertyName("physical")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public bool? Physical { get; set; }

    /// <summary>Human energy in kilocalories</summary>
    [JsonPropertyName("energy")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Energy { get; set; }
}

/// <summary>
/// Target recipient information.
/// </summary>
public class ClaimTarget
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("domain")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Domain { get; set; }
}

/// <summary>
/// JWK public key for Ed25519.
/// </summary>
public class Jwk
{
    [JsonPropertyName("kid")]
    public string Kid { get; set; } = string.Empty;

    [JsonPropertyName("kty")]
    public string Kty { get; set; } = "OKP";

    [JsonPropertyName("crv")]
    public string Crv { get; set; } = "Ed25519";

    [JsonPropertyName("x")]
    public string X { get; set; } = string.Empty;
}

/// <summary>
/// Response from /.well-known/hap.json.
/// </summary>
public class WellKnown
{
    [JsonPropertyName("issuer")]
    public string Issuer { get; set; } = string.Empty;

    [JsonPropertyName("keys")]
    public List<Jwk> Keys { get; set; } = new();
}

/// <summary>
/// Response from the verification API.
/// </summary>
public class VerificationResponse
{
    [JsonPropertyName("valid")]
    public bool Valid { get; set; }

    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("claim")]
    public Claim? Claim { get; set; }

    [JsonPropertyName("jws")]
    public string? Jws { get; set; }

    [JsonPropertyName("issuer")]
    public string? Issuer { get; set; }

    [JsonPropertyName("verifyUrl")]
    public string? VerifyUrl { get; set; }

    [JsonPropertyName("revoked")]
    public bool Revoked { get; set; }

    [JsonPropertyName("revocationReason")]
    public string? RevocationReason { get; set; }

    [JsonPropertyName("revokedAt")]
    public string? RevokedAt { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

/// <summary>
/// Result of signature verification.
/// </summary>
public class SignatureVerificationResult
{
    public bool Valid { get; set; }
    public Claim? Claim { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Decoded compact format data.
/// </summary>
public class DecodedCompact
{
    public Claim Claim { get; set; } = new();
    public byte[] Signature { get; set; } = Array.Empty<byte>();
}

/// <summary>
/// Result of compact format verification.
/// </summary>
public class CompactVerificationResult
{
    public bool Valid { get; set; }
    public Claim? Claim { get; set; }
    public string? Error { get; set; }
}

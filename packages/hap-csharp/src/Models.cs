using System.Text.Json.Serialization;

namespace BlueScroll.Hap;

/// <summary>
/// Base class for HAP claims.
/// </summary>
public abstract class HapClaim
{
    [JsonPropertyName("v")]
    public string V { get; set; } = Hap.Version;

    [JsonPropertyName("id")]
    public string Id { get; set; } = Hap.GenerateHapId();

    [JsonPropertyName("type")]
    public abstract string Type { get; }

    [JsonPropertyName("at")]
    public string At { get; set; } = DateTime.UtcNow.ToString("O");

    [JsonPropertyName("exp")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Exp { get; set; }

    [JsonPropertyName("iss")]
    public string Iss { get; set; } = string.Empty;
}

/// <summary>
/// Human effort verification claim.
/// </summary>
public class HumanEffortClaim : HapClaim
{
    [JsonPropertyName("type")]
    public override string Type => Hap.ClaimTypes.HumanEffort;

    [JsonPropertyName("method")]
    public string Method { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Tier { get; set; }

    [JsonPropertyName("to")]
    public ClaimTarget To { get; set; } = new();
}

/// <summary>
/// Employer commitment claim.
/// </summary>
public class EmployerCommitmentClaim : HapClaim
{
    [JsonPropertyName("type")]
    public override string Type => Hap.ClaimTypes.EmployerCommitment;

    [JsonPropertyName("employer")]
    public EmployerInfo Employer { get; set; } = new();

    [JsonPropertyName("commitment")]
    public string Commitment { get; set; } = string.Empty;
}

/// <summary>
/// Target company information.
/// </summary>
public class ClaimTarget
{
    [JsonPropertyName("company")]
    public string Company { get; set; } = string.Empty;

    [JsonPropertyName("domain")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Domain { get; set; }
}

/// <summary>
/// Employer information.
/// </summary>
public class EmployerInfo
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
public class HapJwk
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
public class HapWellKnown
{
    [JsonPropertyName("issuer")]
    public string Issuer { get; set; } = string.Empty;

    [JsonPropertyName("keys")]
    public List<HapJwk> Keys { get; set; } = new();
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

    [JsonPropertyName("claims")]
    public HumanEffortClaim? Claims { get; set; }

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
    public HumanEffortClaim? Claim { get; set; }
    public string? Error { get; set; }
}

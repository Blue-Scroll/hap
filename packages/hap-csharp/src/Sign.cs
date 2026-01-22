using System.Text;
using System.Text.Json;
using NSec.Cryptography;

namespace BlueScroll.Hap;

/// <summary>
/// HAP claim signing functions (for Verification Authorities).
/// </summary>
public static class HapSigner
{
    /// <summary>
    /// Generates a new Ed25519 key pair for signing HAP claims.
    /// </summary>
    /// <returns>Tuple of (privateKey, publicKey)</returns>
    public static (Key PrivateKey, PublicKey PublicKey) GenerateKeyPair()
    {
        var algorithm = SignatureAlgorithm.Ed25519;
        var privateKey = Key.Create(algorithm, new KeyCreationParameters
        {
            ExportPolicy = KeyExportPolicies.AllowPlaintextExport
        });
        return (privateKey, privateKey.PublicKey);
    }

    /// <summary>
    /// Exports a public key to JWK format suitable for /.well-known/hap.json.
    /// </summary>
    /// <param name="publicKey">The public key to export</param>
    /// <param name="kid">The key ID to assign</param>
    /// <returns>JWK object</returns>
    public static HapJwk ExportPublicKeyJwk(PublicKey publicKey, string kid)
    {
        var bytes = publicKey.Export(KeyBlobFormat.RawPublicKey);
        return new HapJwk
        {
            Kid = kid,
            Kty = "OKP",
            Crv = "Ed25519",
            X = Base64UrlEncode(bytes)
        };
    }

    /// <summary>
    /// Signs a HAP claim with an Ed25519 private key.
    /// </summary>
    /// <param name="claim">The claim to sign</param>
    /// <param name="privateKey">The Ed25519 private key</param>
    /// <param name="kid">Key ID to include in JWS header</param>
    /// <returns>JWS compact serialization string</returns>
    public static string SignClaim(HapClaim claim, Key privateKey, string kid)
    {
        // Create header
        var header = new { alg = "EdDSA", kid };
        var headerJson = JsonSerializer.Serialize(header);
        var headerB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));

        // Create payload
        var payloadJson = JsonSerializer.Serialize(claim, claim.GetType());
        var payloadB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));

        // Create signing input
        var signingInput = $"{headerB64}.{payloadB64}";
        var signingInputBytes = Encoding.ASCII.GetBytes(signingInput);

        // Sign
        var algorithm = SignatureAlgorithm.Ed25519;
        var signature = algorithm.Sign(privateKey, signingInputBytes);
        var signatureB64 = Base64UrlEncode(signature);

        return $"{signingInput}.{signatureB64}";
    }

    /// <summary>
    /// Creates a complete human effort claim with all required fields.
    /// </summary>
    /// <param name="method">Verification method (e.g., "physical_mail")</param>
    /// <param name="recipientName">Recipient name</param>
    /// <param name="issuer">VA's domain</param>
    /// <param name="domain">Recipient domain (optional)</param>
    /// <param name="tier">Service tier (optional)</param>
    /// <param name="expiresInDays">Days until expiration (optional)</param>
    /// <returns>A complete HumanEffortClaim object</returns>
    public static HumanEffortClaim CreateHumanEffortClaim(
        string method,
        string recipientName,
        string issuer,
        string? domain = null,
        string? tier = null,
        int? expiresInDays = null)
    {
        var now = DateTime.UtcNow;
        var claim = new HumanEffortClaim
        {
            V = Hap.Version,
            Id = Hap.GenerateHapId(),
            Method = method,
            To = new ClaimTarget { Name = recipientName, Domain = domain },
            Tier = tier,
            At = now.ToString("O"),
            Iss = issuer
        };

        if (expiresInDays.HasValue)
        {
            claim.Exp = now.AddDays(expiresInDays.Value).ToString("O");
        }

        return claim;
    }

    /// <summary>
    /// Creates a complete recipient commitment claim with all required fields.
    /// </summary>
    /// <param name="recipientName">Recipient's name</param>
    /// <param name="commitment">Commitment level (e.g., "review_verified")</param>
    /// <param name="issuer">VA's domain</param>
    /// <param name="recipientDomain">Recipient's domain (optional)</param>
    /// <param name="expiresInDays">Days until expiration (optional)</param>
    /// <returns>A complete RecipientCommitmentClaim object</returns>
    public static RecipientCommitmentClaim CreateRecipientCommitmentClaim(
        string recipientName,
        string commitment,
        string issuer,
        string? recipientDomain = null,
        int? expiresInDays = null)
    {
        var now = DateTime.UtcNow;
        var claim = new RecipientCommitmentClaim
        {
            V = Hap.Version,
            Id = Hap.GenerateHapId(),
            Recipient = new RecipientInfo { Name = recipientName, Domain = recipientDomain },
            Commitment = commitment,
            At = now.ToString("O"),
            Iss = issuer
        };

        if (expiresInDays.HasValue)
        {
            claim.Exp = now.AddDays(expiresInDays.Value).ToString("O");
        }

        return claim;
    }

    private static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}

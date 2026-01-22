using System.Text;
using System.Text.Json;
using NSec.Cryptography;

namespace BlueScroll.HumanAttestation;

/// <summary>
/// HAP claim signing functions (for Verification Authorities).
/// </summary>
public static class Signer
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
    public static Jwk ExportPublicKeyJwk(PublicKey publicKey, string kid)
    {
        var bytes = publicKey.Export(KeyBlobFormat.RawPublicKey);
        return new Jwk
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
    public static string SignClaim(Claim claim, Key privateKey, string kid)
    {
        // Create header
        var header = new { alg = "EdDSA", kid };
        var headerJson = JsonSerializer.Serialize(header);
        var headerB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));

        // Create payload
        var payloadJson = JsonSerializer.Serialize(claim);
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
    /// Creates a complete HAP claim with all required fields.
    /// </summary>
    /// <param name="method">VA-specific verification method identifier</param>
    /// <param name="description">Human-readable description of the effort</param>
    /// <param name="recipientName">Recipient name</param>
    /// <param name="issuer">VA's domain</param>
    /// <param name="domain">Recipient domain (optional)</param>
    /// <param name="tier">Service tier (optional)</param>
    /// <param name="expiresInDays">Days until expiration (optional)</param>
    /// <param name="cost">Monetary cost (optional)</param>
    /// <param name="time">Time in seconds (optional)</param>
    /// <param name="physical">Whether physical atoms involved (optional)</param>
    /// <param name="energy">Energy in kilocalories (optional)</param>
    /// <returns>A complete Claim object</returns>
    public static Claim CreateClaim(
        string method,
        string description,
        string recipientName,
        string issuer,
        string? domain = null,
        string? tier = null,
        int? expiresInDays = null,
        ClaimCost? cost = null,
        int? time = null,
        bool? physical = null,
        int? energy = null)
    {
        var now = DateTime.UtcNow;
        var claim = new Claim
        {
            V = HumanAttestation.Version,
            Id = HumanAttestation.GenerateId(),
            Method = method,
            Description = description,
            To = new ClaimTarget { Name = recipientName, Domain = domain },
            Tier = tier,
            At = now.ToString("O"),
            Iss = issuer,
            Cost = cost,
            Time = time,
            Physical = physical,
            Energy = energy
        };

        if (expiresInDays.HasValue)
        {
            claim.Exp = now.AddDays(expiresInDays.Value).ToString("O");
        }

        return claim;
    }

    /// <summary>
    /// Base64url encode bytes.
    /// </summary>
    public static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    /// <summary>
    /// Base64url decode string.
    /// </summary>
    public static byte[] Base64UrlDecode(string data)
    {
        var padded = data.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }
        return Convert.FromBase64String(padded);
    }
}

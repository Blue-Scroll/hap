using System.Text;
using System.Web;
using NSec.Cryptography;

namespace BlueScroll.HumanAttestation;

/// <summary>
/// HAP Compact Format utilities for space-efficient serialization.
///
/// Format: HAP{version}.{id}.{method}.{to_name}.{to_domain}.{at}.{exp}.{iss}.{signature}
///
/// Note: Effort dimensions (cost, time, physical, energy) are NOT included in compact format.
/// Compact is for QR codes - minimal representation. Full claims in JWS include all dimensions.
///
/// Example:
/// HAP1.hap_abc123xyz456.ba_priority_mail.Acme%20Corp.acme%2Ecom.1706169600.1769241600.ballista%2Ejobs.MEUCIQDx...
/// </summary>
public static class Compact
{
    private static readonly DateTimeOffset UnixEpoch = new DateTimeOffset(1970, 1, 1, 0, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// Encodes a field for compact format (URL-encode + encode dots).
    /// </summary>
    private static string EncodeCompactField(string value)
    {
        return HttpUtility.UrlEncode(value ?? "").Replace(".", "%2E");
    }

    /// <summary>
    /// Decodes a compact format field.
    /// </summary>
    private static string DecodeCompactField(string value)
    {
        return HttpUtility.UrlDecode(value);
    }

    /// <summary>
    /// Convert ISO 8601 timestamp to Unix epoch seconds.
    /// </summary>
    private static long IsoToUnix(string iso)
    {
        var dt = DateTimeOffset.Parse(iso);
        return (long)(dt - UnixEpoch).TotalSeconds;
    }

    /// <summary>
    /// Convert Unix epoch seconds to ISO 8601 timestamp.
    /// </summary>
    private static string UnixToIso(long unix)
    {
        return UnixEpoch.AddSeconds(unix).ToString("O");
    }

    /// <summary>
    /// Encodes a HAP claim and signature into compact format (9 fields).
    /// </summary>
    /// <param name="claim">The claim to encode</param>
    /// <param name="signature">The Ed25519 signature bytes (64 bytes)</param>
    /// <returns>Compact format string</returns>
    public static string EncodeCompact(Claim claim, byte[] signature)
    {
        var name = claim.To?.Name ?? "";
        var domain = claim.To?.Domain ?? "";

        var atUnix = IsoToUnix(claim.At);
        var expUnix = string.IsNullOrEmpty(claim.Exp) ? 0 : IsoToUnix(claim.Exp);

        return string.Join(".",
            $"HAP{HumanAttestation.CompactVersion}",
            claim.Id,
            claim.Method ?? "",
            EncodeCompactField(name),
            EncodeCompactField(domain),
            atUnix.ToString(),
            expUnix.ToString(),
            EncodeCompactField(claim.Iss),
            Signer.Base64UrlEncode(signature)
        );
    }

    /// <summary>
    /// Decodes a compact format string into claim and signature.
    /// </summary>
    /// <param name="compact">The compact format string</param>
    /// <returns>DecodedCompact with claim and signature</returns>
    /// <exception cref="ArgumentException">If format is invalid</exception>
    public static DecodedCompact DecodeCompact(string compact)
    {
        if (!HumanAttestation.IsValidCompact(compact))
        {
            throw new ArgumentException("Invalid HAP Compact format");
        }

        var parts = compact.Split('.');
        if (parts.Length != 9)
        {
            throw new ArgumentException($"Invalid HAP Compact format: expected 9 fields, got {parts.Length}");
        }

        var version = parts[0];
        var hapId = parts[1];
        var method = parts[2];
        var encodedName = parts[3];
        var encodedDomain = parts[4];
        var atUnixStr = parts[5];
        var expUnixStr = parts[6];
        var encodedIss = parts[7];
        var sigB64 = parts[8];

        if (version != $"HAP{HumanAttestation.CompactVersion}")
        {
            throw new ArgumentException($"Unsupported compact version: {version}");
        }

        var name = DecodeCompactField(encodedName);
        var domain = DecodeCompactField(encodedDomain);
        var iss = DecodeCompactField(encodedIss);
        var atUnix = long.Parse(atUnixStr);
        var expUnix = long.Parse(expUnixStr);
        var signature = Signer.Base64UrlDecode(sigB64);

        var at = UnixToIso(atUnix);
        var exp = expUnix != 0 ? UnixToIso(expUnix) : null;

        var claim = new Claim
        {
            V = HumanAttestation.Version,
            Id = hapId,
            Method = method,
            Description = "", // Not included in compact format
            To = new ClaimTarget { Name = name },
            At = at,
            Iss = iss,
            Exp = exp
        };

        if (!string.IsNullOrEmpty(domain))
        {
            claim.To.Domain = domain;
        }

        return new DecodedCompact { Claim = claim, Signature = signature };
    }

    /// <summary>
    /// Builds the compact payload (everything before the signature).
    /// This is what gets signed.
    /// </summary>
    /// <param name="claim">The claim</param>
    /// <returns>Compact payload string (8 fields)</returns>
    public static string BuildCompactPayload(Claim claim)
    {
        var name = claim.To?.Name ?? "";
        var domain = claim.To?.Domain ?? "";

        var atUnix = IsoToUnix(claim.At);
        var expUnix = string.IsNullOrEmpty(claim.Exp) ? 0 : IsoToUnix(claim.Exp);

        return string.Join(".",
            $"HAP{HumanAttestation.CompactVersion}",
            claim.Id,
            claim.Method ?? "",
            EncodeCompactField(name),
            EncodeCompactField(domain),
            atUnix.ToString(),
            expUnix.ToString(),
            EncodeCompactField(claim.Iss)
        );
    }

    /// <summary>
    /// Signs a claim and returns it in compact format.
    /// </summary>
    /// <param name="claim">The claim to sign</param>
    /// <param name="privateKey">The Ed25519 private key</param>
    /// <returns>Signed compact format string</returns>
    public static string SignCompact(Claim claim, Key privateKey)
    {
        var payload = BuildCompactPayload(claim);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        var algorithm = SignatureAlgorithm.Ed25519;
        var signature = algorithm.Sign(privateKey, payloadBytes);

        return $"{payload}.{Signer.Base64UrlEncode(signature)}";
    }

    /// <summary>
    /// Verifies a compact format string using provided public keys.
    /// </summary>
    /// <param name="compact">The compact format string</param>
    /// <param name="publicKeys">Array of JWK public keys to try</param>
    /// <returns>CompactVerificationResult</returns>
    public static CompactVerificationResult VerifyCompact(string compact, IEnumerable<Jwk> publicKeys)
    {
        if (!HumanAttestation.IsValidCompact(compact))
        {
            return new CompactVerificationResult { Valid = false, Error = "Invalid compact format" };
        }

        try
        {
            // Split to get payload and signature
            var lastDot = compact.LastIndexOf('.');
            var payload = compact[..lastDot];
            var sigB64 = compact[(lastDot + 1)..];
            var signature = Signer.Base64UrlDecode(sigB64);
            var payloadBytes = Encoding.UTF8.GetBytes(payload);

            var algorithm = SignatureAlgorithm.Ed25519;

            // Try each public key
            foreach (var jwk in publicKeys)
            {
                try
                {
                    var xBytes = Signer.Base64UrlDecode(jwk.X);
                    var publicKey = PublicKey.Import(algorithm, xBytes, KeyBlobFormat.RawPublicKey);

                    // Verify signature
                    if (algorithm.Verify(publicKey, payloadBytes, signature))
                    {
                        var decoded = DecodeCompact(compact);
                        return new CompactVerificationResult { Valid = true, Claim = decoded.Claim };
                    }
                }
                catch
                {
                    // Try next key
                    continue;
                }
            }

            return new CompactVerificationResult { Valid = false, Error = "Signature verification failed" };
        }
        catch (Exception e)
        {
            return new CompactVerificationResult { Valid = false, Error = e.Message };
        }
    }

    /// <summary>
    /// Generates a verification URL with embedded compact claim.
    /// </summary>
    /// <param name="baseUrl">Base verification URL (e.g., "https://ballista.jobs/v")</param>
    /// <param name="compact">The compact format string</param>
    /// <returns>URL with compact claim in query parameter</returns>
    public static string GenerateVerificationUrl(string baseUrl, string compact)
    {
        return $"{baseUrl}?c={HttpUtility.UrlEncode(compact)}";
    }

    /// <summary>
    /// Extracts compact claim from a verification URL.
    /// </summary>
    /// <param name="url">The verification URL</param>
    /// <returns>Compact string or null if not found</returns>
    public static string? ExtractCompactFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var query = HttpUtility.ParseQueryString(uri.Query);
            var compact = query["c"];

            if (!string.IsNullOrEmpty(compact) && HumanAttestation.IsValidCompact(compact))
            {
                return compact;
            }

            return null;
        }
        catch
        {
            return null;
        }
    }
}
